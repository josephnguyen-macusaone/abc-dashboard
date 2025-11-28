/**
 * Cache Service Interface
 * Defines the contract for caching operations
 */

/**
 * @interface ICacheService
 */
export class ICacheService {
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    throw new Error('Method not implemented: get');
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async set(key, value, ttl) {
    throw new Error('Method not implemented: set');
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if deleted
   */
  async del(key) {
    throw new Error('Method not implemented: del');
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if exists
   */
  async exists(key) {
    throw new Error('Method not implemented: exists');
  }

  /**
   * Set multiple key-value pairs
   * @param {Object[]} keyValuePairs - Array of { key, value } objects
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async mset(keyValuePairs, ttl) {
    throw new Error('Method not implemented: mset');
  }

  /**
   * Clear cache (optionally by pattern)
   * @param {string} pattern - Optional pattern to match keys
   * @returns {Promise<number>} Number of keys cleared
   */
  async clear(pattern) {
    throw new Error('Method not implemented: clear');
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats (hits, misses, size, etc.)
   */
  async stats() {
    throw new Error('Method not implemented: stats');
  }
}

export default ICacheService;
