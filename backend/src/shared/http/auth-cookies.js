/**
 * Auth cookie helpers for HttpOnly token storage
 */
import { config } from '../../infrastructure/config/config.js';

const TOKEN_COOKIE_NAME = 'token';
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

// Express res.cookie maxAge is in MILLISECONDS (it divides by 1000 internally for Max-Age header)
/** Max age in ms: 1h for access token */
const TOKEN_MAX_AGE = 60 * 60 * 1000;
/** Max age in ms: 7d for refresh token */
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getBaseOptions() {
  const options = {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.COOKIE_SAME_SITE,
    path: '/',
  };
  if (config.COOKIE_DOMAIN) {
    options.domain = config.COOKIE_DOMAIN;
  }
  return options;
}

/**
 * Set access token cookie
 */
export function setTokenCookie(res, token) {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    ...getBaseOptions(),
    maxAge: TOKEN_MAX_AGE,
  });
}

/**
 * Set refresh token cookie
 */
export function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...getBaseOptions(),
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

/**
 * Clear auth cookies (logout)
 */
export function clearAuthCookies(res) {
  const base = { path: '/', ...(config.COOKIE_DOMAIN && { domain: config.COOKIE_DOMAIN }) };
  res.clearCookie(TOKEN_COOKIE_NAME, base);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, base);
}

/**
 * Get token from request (Authorization header or cookie)
 */
export function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const cookieToken = req.cookies?.[TOKEN_COOKIE_NAME];
  return bearerToken || cookieToken || null;
}

/**
 * Get refresh token from request (body or cookie)
 */
export function getRefreshTokenFromRequest(req) {
  return req.body?.refreshToken || req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || null;
}
