/**
 * Extracts userId from JWT for cache key scoping.
 * Runs before responseCachingMiddleware so we can cache authenticated GET responses
 * with user-scoped keys. Does not perform full auth - only decodes valid tokens.
 */
import jwt from 'jsonwebtoken';
import { config } from '../../../config/config.js';

export const extractUserIdForCache = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
    req.userIdForCache = decoded.userId ?? decoded.sub ?? decoded.id ?? null;
  } catch {
    // Invalid or expired token - don't set userIdForCache; response cache will use unauthenticated key or skip
  }

  next();
};
