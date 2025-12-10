import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTE_CONFIGS, AUTH_ROUTES, canAccessRoute, getDefaultRedirect, isAuthRoute } from '@/shared/constants/routes';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

export function middleware(request: NextRequest) {
  // Generate correlation ID for this request
  const correlationId = generateCorrelationId();
  const middlewareLogger = logger.createChild({
    correlationId,
    component: 'Middleware'
  });

  const { pathname } = request.nextUrl;

  // ==========================================================================
  // SECURITY: Block malformed Server Action requests from bots/scanners
  // These are external bots sending POST requests with invalid "Next-Action: x" headers
  // ==========================================================================
  const nextActionHeader = request.headers.get('next-action');
  if (nextActionHeader) {
    // Valid Server Action IDs are 40-character hex hashes (SHA-1)
    // Invalid ones like "x", "test", or random strings are bot probes
    const isValidActionId = /^[a-f0-9]{40}$/i.test(nextActionHeader);

    if (!isValidActionId) {
      // Silently reject invalid Server Action requests (don't log to reduce noise)
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // This app doesn't use Server Actions - block ALL Server Action requests
    return new NextResponse(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  middlewareLogger.debug('Processing request', {
    pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent')?.substring(0, 100)
  });

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Get auth token from cookies (using the same names as CookieService)
  const token = request.cookies.get('token')?.value;
  const userData = request.cookies.get('user')?.value;

  let user: { id?: string; role?: string; email?: string; isActive?: boolean } | null = null;
  let isAuthenticated = false;

  try {
    if (token && userData) {
      user = JSON.parse(userData) as { id?: string; role?: string; email?: string; isActive?: boolean };
      // Ensure user has required fields for role checking
      if (user && user.role) {
        isAuthenticated = true;
        middlewareLogger.debug('User authenticated', {
          userId: user.id,
          userRole: user.role,
          userEmail: user.email
        });
      } else {
        middlewareLogger.warn('User data missing role field', {
          userId: user?.id,
          userData: userData.substring(0, 100)
        });
        isAuthenticated = false;
      }
    } else {
      middlewareLogger.debug('No authentication cookies found');
    }
  } catch (error) {
    middlewareLogger.warn('Failed to parse authentication data', {
      error: error instanceof Error ? error.message : String(error),
      hasToken: !!token,
      hasUserData: !!userData
    });
    isAuthenticated = false;
  }

  // Skip auth checks during static generation (no cookies available)
  // This prevents build-time blocking of protected routes
  const isStaticGeneration = !token && !userData;
  if (isStaticGeneration) {
    middlewareLogger.debug('Skipping auth checks during static generation');
    return NextResponse.next();
  }

  // Check if current route is protected
  const routeConfig = Object.values(ROUTE_CONFIGS).find(config =>
    pathname.startsWith(config.path)
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
      return NextResponse.redirect(loginUrl);
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
        return NextResponse.redirect(new URL(redirectPath, request.url));
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
      return NextResponse.redirect(verifyUrl);
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
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
