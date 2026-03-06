/**
 * Shared logger export
 *
 * Domain and application layers import from here (`shared/`) rather than
 * directly from `infrastructure/config/logger.js`.  This keeps the
 * Clean Architecture boundary intact while giving every layer access to
 * the unified Winston logger.
 */
export { default } from '../../infrastructure/config/logger.js';
