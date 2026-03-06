import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTE_CONFIGS, canAccessRoute, getDefaultRedirect, isAuthRoute } from '@/shared/constants/routes';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

/**
 * Decode JWT payload without verification (middleware uses for role/isActive only;
 * API still verifies token). Returns null on parse error.
 */
function decodeJwtPayload(token: string): { role?: string; isActive?: boolean; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as { role?: string; isActive?: boolean; exp?: number };
  } catch {
    return null;
  }
}

/**
 * Build connect-src value for CSP. Allows same-origin plus API origin when frontend and API
 * run on different origins (e.g. app on :3000, API on :5001). Uses NEXT_PUBLIC_API_URL.
 */
function getConnectSrc(): string {
  if (process.env.NEXT_PUBLIC_USE_RELATIVE_API === 'true') return "'self'";
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    return "'self' http://localhost:5000 http://localhost:5001";
  }
  try {
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    const origin = new URL(url).origin;
    return `'self' ${origin}`;
  } catch {
    return "'self' http://localhost:5000 http://localhost:5001";
  }
}

/**
 * Build Content-Security-Policy with optional nonce (Phase 5 hardening).
 * - Production: nonce for scripts/styles; no unsafe-eval
 * - Development: unsafe-eval required for React dev; unsafe-inline for HMR
 */
function buildCsp(nonce?: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = nonce && !isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`;
  // 'unsafe-inline' is required for style-src even in production because inline
  // style="" attributes (used by Radix UI, Tailwind, and Next.js internals) cannot
  // be nonce'd — only <style> elements support nonces. CSS injection attacks are
  // far less severe than JS injection, so this trade-off is widely accepted.
  const styleSrc = `'self' 'unsafe-inline'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${getConnectSrc()}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    isDev ? "report-uri /api/csp-report" : ""
  ].filter(Boolean).join('; ');
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Apply security headers to response (CSP with optional nonce in production).
 */
function applySecurityHeaders(response: NextResponse, nonce?: string) {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
}

/** Generate CSP nonce for production (Next.js picks up x-nonce for inline scripts). Edge-safe. */
function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export function middleware(request: NextRequest) {
  // Generate correlation ID for this request
  const correlationId = generateCorrelationId();
  const middlewareLogger = logger.createChild({
    correlationId,
    component: 'Middleware'
  });

  const { pathname } = request.nextUrl;

  // CSP nonce for production (enables strict script-src without unsafe-inline)
  const nonce = process.env.NODE_ENV === 'production' ? generateNonce() : undefined;

  // ==========================================================================
  // SECURITY: Block malformed Server Action requests from bots/scanners
  // Validate Server Action IDs to prevent malicious requests
  // ==========================================================================
  const nextActionHeader = request.headers.get('next-action');
  if (nextActionHeader) {
    // Valid Server Action IDs are 40-character hex hashes (SHA-1)
    // Invalid ones like "x", "test", or random strings are bot probes
    const isValidActionId = /^[a-f0-9]{40}$/i.test(nextActionHeader);

    if (!isValidActionId) {
      // Log and reject invalid Server Action requests (bots/scanners)
      // Using debug level since this is expected security behavior
      middlewareLogger.debug('Security: Blocked invalid Server Action probe', {
        nextActionHeader: nextActionHeader.substring(0, 50), // Truncate for security
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        pathname,
        method: request.method
      });

      const response = new NextResponse(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
      applySecurityHeaders(response, nonce);
      return response;
    }

    // Allow valid Server Action requests to proceed
    // Next.js will handle the actual server action routing
    middlewareLogger.debug('Allowing valid Server Action request', {
      nextActionId: nextActionHeader.substring(0, 8) + '...', // Log partial ID for debugging
      pathname
    });
  }

  middlewareLogger.debug('Processing request', {
    pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent')?.substring(0, 100)
  });

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    const res = NextResponse.next();
    applySecurityHeaders(res, nonce);
    return res;
  }

  // Get auth token from cookies (derive role/isActive from JWT; don't trust user cookie for auth)
  const token = request.cookies.get('token')?.value;
  const userData = request.cookies.get('user')?.value;

  let user: { id?: string; role?: string; email?: string; isActive?: boolean } | null = null;
  let isAuthenticated = false;

  try {
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload && payload.role !== undefined) {
        // Role from JWT (trusted); isActive from JWT for verify-email redirect
        user = {
          role: payload.role,
          isActive: payload.isActive ?? true,
        };
        // Fallback: merge display name from user cookie if present (for logging only)
        if (userData) {
          try {
            const parsed = JSON.parse(userData) as { id?: string; email?: string };
            user.id = parsed.id;
            user.email = parsed.email;
          } catch {
            // ignore
          }
        }
        isAuthenticated = true;
        middlewareLogger.debug('User authenticated (role from JWT)', {
          userId: user.id,
          userRole: user.role,
          userEmail: user.email
        });
      } else {
        middlewareLogger.warn('JWT missing role field', payload ? { hasRole: !!payload.role } : { payload: null });
        isAuthenticated = false;
      }
    } else {
      middlewareLogger.debug('No authentication token found');
    }
  } catch (error) {
    middlewareLogger.warn('Failed to parse authentication data', {
      error: error instanceof Error ? error.message : String(error),
      hasToken: !!token,
    });
    isAuthenticated = false;
  }

  // Skip auth checks during static generation (no cookies available)
  // This prevents build-time blocking of protected routes
  const isStaticGeneration = !token && !userData;
  if (isStaticGeneration) {
    middlewareLogger.debug('Skipping auth checks during static generation');
    const reqHeaders = new Headers(request.headers);
    if (nonce) reqHeaders.set('x-nonce', nonce);
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    applySecurityHeaders(res, nonce);
    return res;
  }

  // Match the most specific route (longest path that matches) so e.g. /profile/edit
  // matches PROFILE_EDIT, not PROFILE or HOME. Sort by path length descending.
  const sortedConfigs = Object.values(ROUTE_CONFIGS).sort(
    (a, b) => b.path.length - a.path.length
  );
  const routeConfig = sortedConfigs.find(config =>
    pathname === config.path || pathname.startsWith(config.path + '/')
  );

  middlewareLogger.debug('Route protection check', {
    pathname,
    routeConfig: routeConfig ? {
      path: routeConfig.path,
      requireAuth: routeConfig.requireAuth,
      allowedRoles: routeConfig.allowedRoles
    } : null
  });

  if (routeConfig) {
    // Require authentication
    if (routeConfig.requireAuth && !isAuthenticated) {
      logger.security('Unauthenticated access attempt', {
        correlationId,
        pathname,
        userId: user?.id,
        redirectTo: routeConfig.redirectTo || '/login'
      });
      const loginUrl = new URL(routeConfig.redirectTo || '/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeaders(response, nonce);
      return response;
    }

    // Check role-based access
    if (routeConfig.allowedRoles && user?.role) {
      if (!canAccessRoute(pathname, user.role)) {
        logger.security('Unauthorized role access attempt', {
          correlationId,
          pathname,
          userId: user.id,
          userRole: user.role,
          requiredRoles: routeConfig.allowedRoles,
          redirectTo: getDefaultRedirect(user.role)
        });
        // Redirect to appropriate page based on user role
        const redirectPath = getDefaultRedirect(user.role);
        const response = NextResponse.redirect(new URL(redirectPath, request.url));
        applySecurityHeaders(response, nonce);
        return response;
      }
    }

    // Check if user needs email verification
    if (isAuthenticated && user && !user.isActive) {
      logger.security('Unverified user access attempt', {
        correlationId,
        pathname,
        userId: user.id,
        userEmail: user.email,
        redirectTo: '/verify-email'
      });
      const verifyUrl = new URL('/verify-email', request.url);
      verifyUrl.searchParams.set('email', user.email || '');
      const response = NextResponse.redirect(verifyUrl);
      applySecurityHeaders(response, nonce);
      return response;
    }

    middlewareLogger.debug('Route access granted', {
      pathname,
      userId: user?.id,
      userRole: user?.role
    });
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute(pathname) && isAuthenticated && user?.isActive) {
    middlewareLogger.debug('Redirecting authenticated user from auth page', {
      pathname,
      userId: user.id,
      userRole: user.role,
      redirectTo: getDefaultRedirect(user.role)
    });
    const redirectPath = getDefaultRedirect(user.role);
    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    applySecurityHeaders(response, nonce);
    return response;
  }

  // Pass nonce to request for Next.js to apply to inline scripts
  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    requestHeaders.set('x-nonce', nonce);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySecurityHeaders(response, nonce);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match ALL request paths to catch server actions and other requests
     * We'll filter out static files and API routes in the middleware logic
     */
    '/(.*)',
  ],
};
