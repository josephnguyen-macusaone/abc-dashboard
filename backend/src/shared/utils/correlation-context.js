/**
 * Correlation ID context via AsyncLocalStorage
 *
 * Instead of mutating shared singleton instances (which races under concurrent
 * requests), we store the correlation ID in an async-local store that is
 * automatically propagated to every child async operation in the same request.
 *
 * Usage:
 *   // In middleware (once per request):
 *   correlationContext.run(correlationId, next);
 *
 *   // Anywhere in the call chain (no argument threading needed):
 *   import { getCorrelationId } from '.../correlation-context.js';
 *   logger.info('msg', { correlationId: getCorrelationId() });
 */
import { AsyncLocalStorage } from 'async_hooks';

const store = new AsyncLocalStorage();

/**
 * Run `fn` with `correlationId` bound to the current async context.
 * All async operations spawned inside `fn` will inherit the same value.
 *
 * @param {string}   correlationId
 * @param {Function} fn  - callback (usually `next` from Express middleware)
 */
export function runWithCorrelationId(correlationId, fn) {
  store.run(correlationId, fn);
}

/**
 * Retrieve the correlation ID for the current async context.
 * Returns `undefined` when called outside a tracked context.
 *
 * @returns {string | undefined}
 */
export function getCorrelationId() {
  return store.getStore();
}
