/**
 * Query Optimizer
 * Helper functions for optimizing database queries
 */

/**
 * User field projections for different scenarios
 *
 * @type {Object} - User field projections
 */
export const USER_PROJECTIONS = {
  // Minimal fields for lists and references
  minimal: ['id', 'email', 'display_name', 'role'],

  // Standard fields for most API responses
  standard: [
    'id',
    'email',
    'username',
    'display_name',
    'role',
    'is_active',
    'created_at',
    'updated_at',
  ],

  // Full fields including relationships
  full: [
    'id',
    'email',
    'username',
    'display_name',
    'first_name',
    'last_name',
    'phone',
    'role',
    'is_active',
    'managed_by',
    'created_by',
    'last_modified_by',
    'created_at',
    'updated_at',
    'last_login_at',
  ],

  // Export fields (all non-sensitive data)
  export: [
    'id',
    'email',
    'username',
    'display_name',
    'first_name',
    'last_name',
    'phone',
    'role',
    'is_active',
    'created_at',
    'updated_at',
    'last_login_at',
  ],
};

/**
 * License field projections
 *
 * @type {Object} - License field projections
 */
export const LICENSE_PROJECTIONS = {
  // Minimal fields for lists
  minimal: ['id', 'key', 'dba', 'status', 'plan'],

  // Standard fields for API responses
  standard: [
    'id',
    'key',
    'product',
    'plan',
    'status',
    'term',
    'dba',
    'zip',
    'seats_total',
    'seats_used',
    'utilization_percent',
    'starts_at',
    'expires_at',
    'created_at',
    'updated_at',
  ],

  // Full fields
  full: [
    'id',
    'key',
    'product',
    'plan',
    'status',
    'term',
    'seats_total',
    'seats_used',
    'utilization_percent',
    'starts_at',
    'expires_at',
    'cancel_date',
    'dba',
    'zip',
    'last_payment',
    'sms_purchased',
    'sms_sent',
    'sms_balance',
    'agents',
    'agents_name',
    'agents_cost',
    'notes',
    'created_at',
    'updated_at',
  ],

  // Export fields
  export: [
    'id',
    'key',
    'product',
    'plan',
    'status',
    'term',
    'dba',
    'zip',
    'seats_total',
    'seats_used',
    'utilization_percent',
    'starts_at',
    'expires_at',
    'last_payment',
    'sms_purchased',
    'sms_sent',
    'sms_balance',
    'created_at',
  ],
};

/**
 * Apply field projection to a query
 *
 * @param {Object} query - Knex query builder
 * @param {string[]} fields - Array of field names to select
 * @param {string} tableName - Table name for prefixing
 * @return {Object} Modified query
 */
export function applyProjection(query, fields, tableName = null) {
  if (!fields || fields.length === 0) {
    return query;
  }

  const selectedFields = tableName ? fields.map((field) => `${tableName}.${field}`) : fields;

  return query.select(selectedFields);
}

/**
 * Optimize query with common patterns
 *
 * @param {Object} query - Knex query builder
 * @param {Object} options - Optimization options
 * @return {Object} Optimized query
 */
export function optimizeQuery(query, options = {}) {
  const {
    projection = null,
    tableName = null,
    timeout = 5000,
    forUpdate = false,
    skipLocked = false,
  } = options;

  // Apply field projection
  if (projection) {
    applyProjection(query, projection, tableName);
  }

  // Set query timeout
  query.timeout(timeout);

  // Apply row locking if needed
  if (forUpdate) {
    query.forUpdate();
    if (skipLocked) {
      query.skipLocked();
    }
  }

  return query;
}

/**
 * Build optimized join for manager information
 *
 * @param {Object} query - Knex query builder
 * @param {boolean} includeManagerDetails - Whether to include full manager details
 * @return {Object} Modified query
 */
export function joinManager(query, includeManagerDetails = false) {
  if (includeManagerDetails) {
    query
      .leftJoin('users as managers', 'users.managed_by', 'managers.id')
      .select([
        'managers.id as manager_id',
        'managers.email as manager_email',
        'managers.display_name as manager_name',
      ]);
  }
  return query;
}

/**
 * Build optimized join for user profile
 *
 * @param {Object} query - Knex query builder
 * @return {Object} Modified query
 */
export function joinUserProfile(query) {
  query
    .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
    .select([
      'user_profiles.avatar_url',
      'user_profiles.bio',
      'user_profiles.date_of_birth',
      'user_profiles.address',
      'user_profiles.city',
      'user_profiles.state',
      'user_profiles.country',
      'user_profiles.postal_code',
    ]);
  return query;
}

/**
 * Build optimized pagination
 *
 * @param {Object} query - Knex query builder
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @return {Object} Modified query
 */
export function applyPagination(query, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  return query.limit(limit).offset(offset);
}

/**
 * Build optimized sorting
 *
 * @param {Object} query - Knex query builder
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @param {string} tableName - Table name for prefixing
 * @return {Object} Modified query
 */
export function applySorting(query, sortBy, sortOrder = 'asc', tableName = null) {
  if (!sortBy) return query;

  const sortField = tableName ? `${tableName}.${sortBy}` : sortBy;
  return query.orderBy(sortField, sortOrder);
}

/**
 * Execute query with automatic performance logging
 *
 * @param {Object} query - Knex query builder
 * @param {string} queryName - Name for logging
 * @param {Object} logger - Logger instance
 * @return {Promise<any>} Query result
 */
export async function executeOptimized(query, queryName, logger) {
  const startTime = Date.now();

  try {
    const result = await query;
    const duration = Date.now() - startTime;

    // Log slow queries (>500ms)
    if (duration > 500) {
      logger.warn(`Slow query detected: ${queryName}`, {
        queryName,
        duration,
        threshold: 500,
      });
    } else {
      logger.debug(`Query executed: ${queryName}`, {
        queryName,
        duration,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Query failed: ${queryName}`, {
      queryName,
      duration,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Build a count query without fetching data
 * More efficient than fetching all rows and counting in memory
 *
 * @param {Object} db - Database connection
 * @param {string} tableName - Table to count from
 * @param {Object} whereConditions - Where conditions
 * @return {Promise<number>} Count result
 */
export async function optimizedCount(db, tableName, whereConditions = {}) {
  const result = await db(tableName).where(whereConditions).count('* as count').first();
  return parseInt(result.count, 10);
}

/**
 * Batch load related data to avoid N+1 queries
 *
 * @param {Object} db - Database connection
 * @param {string} tableName - Related table name
 * @param {string} foreignKey - Foreign key column
 * @param {string[]} ids - Array of IDs to load
 * @param {string[]} projection - Fields to select
 * @return {Promise<Object>} Map of id -> related data
 */
export async function batchLoad(db, tableName, foreignKey, ids, projection = ['*']) {
  if (!ids || ids.length === 0) {
    return {};
  }

  const results = await db(tableName).whereIn(foreignKey, ids).select(projection);

  // Group by foreign key
  const grouped = {};
  results.forEach((row) => {
    const key = row[foreignKey];
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(row);
  });

  return grouped;
}

/**
 * Full-text search using PostgreSQL tsvector
 *
 * @param {Object} query - Knex query builder
 * @param {string} searchTerm - Search term
 * @param {string[]} fields - Fields to search
 * @param {string} tableName - Table name
 * @return {Object} Modified query
 */
export function applyFullTextSearch(query, searchTerm, fields, tableName) {
  if (!searchTerm) return query;

  // Use the pre-created GIN index
  const vectorExpression = fields
    .map((field) => `COALESCE(${tableName}.${field}, '')`)
    .join(` || ' ' || `);

  return query.whereRaw(
    `to_tsvector('english', ${vectorExpression}) @@ plainto_tsquery('english', ?)`,
    [searchTerm]
  );
}

/**
 * Query performance hints
 *
 * @type {Object} - Query performance hints
 */
export const QUERY_HINTS = {
  // Use for read-heavy operations
  USE_INDEX: (indexName) => `USE INDEX (${indexName})`,

  // Prefer smaller tables first in joins
  STRAIGHT_JOIN: 'STRAIGHT_JOIN',

  // Optimize for finding first matching row
  SQL_NO_CACHE: 'SQL_NO_CACHE',
};

export default {
  USER_PROJECTIONS,
  LICENSE_PROJECTIONS,
  applyProjection,
  optimizeQuery,
  joinManager,
  joinUserProfile,
  applyPagination,
  applySorting,
  executeOptimized,
  optimizedCount,
  batchLoad,
  applyFullTextSearch,
  QUERY_HINTS,
};
