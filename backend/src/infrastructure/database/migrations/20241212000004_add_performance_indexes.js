import logger from '../../config/logger.js';

/**
 * Migration: Add Performance Indexes
 * Adds indexes for search performance, filtering, and common queries
 */
export async function up(knex) {
  logger.info('Adding performance indexes...');

  // ==========================================================================
  // Users Table Indexes
  // ==========================================================================

  // Email index (already exists as unique, but verify)
  // await knex.schema.table('users', (table) => {
  //   table.unique('email'); // Already exists
  // });

  // Username index for quick lookups
  await knex.schema.table('users', (table) => {
    table.index('username', 'idx_users_username');
  });

  // Phone index for search
  await knex.schema.table('users', (table) => {
    table.index('phone', 'idx_users_phone');
  });

  // Display name index for search
  await knex.schema.table('users', (table) => {
    table.index('display_name', 'idx_users_display_name');
  });

  // Role index for filtering
  await knex.schema.table('users', (table) => {
    table.index('role', 'idx_users_role');
  });

  // Active status index for filtering
  await knex.schema.table('users', (table) => {
    table.index('is_active', 'idx_users_is_active');
  });

  // Manager lookup index
  await knex.schema.table('users', (table) => {
    table.index('managed_by', 'idx_users_managed_by');
  });

  // Composite index for common query (role + active status)
  await knex.schema.table('users', (table) => {
    table.index(['role', 'is_active'], 'idx_users_role_active');
  });

  // Date range filtering indexes
  await knex.schema.table('users', (table) => {
    table.index('created_at', 'idx_users_created_at');
    table.index('updated_at', 'idx_users_updated_at');
  });

  // Full-text search index (GIN) for multi-field search
  // PostgreSQL-specific
  await knex.raw(`
    CREATE INDEX idx_users_fulltext_search ON users
    USING GIN (to_tsvector('english',
      COALESCE(email, '') || ' ' ||
      COALESCE(display_name, '') || ' ' ||
      COALESCE(username, '') || ' ' ||
      COALESCE(phone, '')
    ))
  `);

  // ==========================================================================
  // Licenses Table Indexes
  // ==========================================================================

  // License key index (already should exist as unique, but verify)
  await knex.schema.table('licenses', (table) => {
    table.index('key', 'idx_licenses_key');
  });

  // DBA name index for search
  await knex.schema.table('licenses', (table) => {
    table.index('dba', 'idx_licenses_dba');
  });

  // Product and plan indexes for filtering
  await knex.schema.table('licenses', (table) => {
    table.index('product', 'idx_licenses_product');
    table.index('plan', 'idx_licenses_plan');
  });

  // Status and term indexes for filtering
  await knex.schema.table('licenses', (table) => {
    table.index('status', 'idx_licenses_status');
    table.index('term', 'idx_licenses_term');
  });

  // ZIP code index for location filtering
  await knex.schema.table('licenses', (table) => {
    table.index('zip', 'idx_licenses_zip');
  });

  // Date indexes for expiration and range queries
  await knex.schema.table('licenses', (table) => {
    table.index('starts_at', 'idx_licenses_starts_at');
    table.index('expires_at', 'idx_licenses_expires_at');
    table.index('updated_at', 'idx_licenses_updated_at');
  });

  // Composite index for active licenses query
  await knex.schema.table('licenses', (table) => {
    table.index(['status', 'expires_at'], 'idx_licenses_status_expires');
  });

  // Seats indexes for availability queries
  await knex.schema.table('licenses', (table) => {
    table.index('seats_total', 'idx_licenses_seats_total');
    table.index('seats_used', 'idx_licenses_seats_used');
  });

  // Utilization index (computed column)
  await knex.schema.table('licenses', (table) => {
    table.index('utilization_percent', 'idx_licenses_utilization');
  });

  // Full-text search index for licenses
  await knex.raw(`
    CREATE INDEX idx_licenses_fulltext_search ON licenses
    USING GIN (to_tsvector('english',
      COALESCE(key, '') || ' ' ||
      COALESCE(dba, '') || ' ' ||
      COALESCE(product, '') || ' ' ||
      COALESCE(plan, '')
    ))
  `);

  // ==========================================================================
  // License Assignments Table Indexes
  // ==========================================================================

  // License ID index (foreign key, should already exist)
  await knex.schema.table('license_assignments', (table) => {
    table.index('license_id', 'idx_assignments_license_id');
  });

  // User ID index (foreign key, should already exist)
  await knex.schema.table('license_assignments', (table) => {
    table.index('user_id', 'idx_assignments_user_id');
  });

  // Status index for filtering active assignments
  await knex.schema.table('license_assignments', (table) => {
    table.index('status', 'idx_assignments_status');
  });

  // Assigned by index for audit
  await knex.schema.table('license_assignments', (table) => {
    table.index('assigned_by', 'idx_assignments_assigned_by');
  });

  // Date indexes for assignment queries
  await knex.schema.table('license_assignments', (table) => {
    table.index('assigned_at', 'idx_assignments_assigned_at');
    table.index('revoked_at', 'idx_assignments_revoked_at');
  });

  // Composite index for active assignments per license
  await knex.schema.table('license_assignments', (table) => {
    table.index(['license_id', 'status'], 'idx_assignments_license_status');
  });

  // ==========================================================================
  // License Audit Events Table Indexes
  // ==========================================================================

  // Entity type and ID for audit trail queries
  await knex.schema.table('license_audit_events', (table) => {
    table.index('entity_type', 'idx_audit_entity_type');
    table.index('entity_id', 'idx_audit_entity_id');
  });

  // Composite index for entity audit trail
  await knex.schema.table('license_audit_events', (table) => {
    table.index(['entity_type', 'entity_id'], 'idx_audit_entity');
  });

  // Event type index for filtering
  await knex.schema.table('license_audit_events', (table) => {
    table.index('type', 'idx_audit_type');
  });

  // Actor ID for user activity tracking
  await knex.schema.table('license_audit_events', (table) => {
    table.index('actor_id', 'idx_audit_actor_id');
  });

  // Created at index for time-based queries
  await knex.schema.table('license_audit_events', (table) => {
    table.index('created_at', 'idx_audit_created_at');
  });

  // Composite index for actor activity over time
  await knex.schema.table('license_audit_events', (table) => {
    table.index(['actor_id', 'created_at'], 'idx_audit_actor_time');
  });

  // ==========================================================================
  // User Profiles Table Indexes
  // ==========================================================================

  // User ID index (foreign key)
  await knex.schema.table('user_profiles', (table) => {
    table.index('user_id', 'idx_profiles_user_id');
  });

  // Date indexes for user activity tracking
  await knex.schema.table('user_profiles', (table) => {
    table.index('last_login_at', 'idx_profiles_last_login_at');
    table.index('last_activity_at', 'idx_profiles_last_activity_at');
  });

  logger.info('Performance indexes added successfully');
}

export async function down(knex) {
  logger.info('Removing performance indexes...');

  // ==========================================================================
  // Users Table Indexes
  // ==========================================================================
  await knex.schema.table('users', (table) => {
    table.dropIndex('username', 'idx_users_username');
    table.dropIndex('phone', 'idx_users_phone');
    table.dropIndex('display_name', 'idx_users_display_name');
    table.dropIndex('role', 'idx_users_role');
    table.dropIndex('is_active', 'idx_users_is_active');
    table.dropIndex('managed_by', 'idx_users_managed_by');
    table.dropIndex(['role', 'is_active'], 'idx_users_role_active');
    table.dropIndex('created_at', 'idx_users_created_at');
    table.dropIndex('updated_at', 'idx_users_updated_at');
    table.dropIndex('last_login_at', 'idx_users_last_login_at');
  });

  await knex.raw('DROP INDEX IF EXISTS idx_users_fulltext_search');

  // ==========================================================================
  // Licenses Table Indexes
  // ==========================================================================
  await knex.schema.table('licenses', (table) => {
    table.dropIndex('key', 'idx_licenses_key');
    table.dropIndex('dba', 'idx_licenses_dba');
    table.dropIndex('product', 'idx_licenses_product');
    table.dropIndex('plan', 'idx_licenses_plan');
    table.dropIndex('status', 'idx_licenses_status');
    table.dropIndex('term', 'idx_licenses_term');
    table.dropIndex('zip', 'idx_licenses_zip');
    table.dropIndex('starts_at', 'idx_licenses_starts_at');
    table.dropIndex('expires_at', 'idx_licenses_expires_at');
    table.dropIndex('updated_at', 'idx_licenses_updated_at');
    table.dropIndex(['status', 'expires_at'], 'idx_licenses_status_expires');
    table.dropIndex('seats_total', 'idx_licenses_seats_total');
    table.dropIndex('seats_used', 'idx_licenses_seats_used');
    table.dropIndex('utilization_percent', 'idx_licenses_utilization');
  });

  await knex.raw('DROP INDEX IF EXISTS idx_licenses_fulltext_search');

  // ==========================================================================
  // License Assignments Table Indexes
  // ==========================================================================
  await knex.schema.table('license_assignments', (table) => {
    table.dropIndex('license_id', 'idx_assignments_license_id');
    table.dropIndex('user_id', 'idx_assignments_user_id');
    table.dropIndex('assignment_status', 'idx_assignments_status');
    table.dropIndex('assigned_by', 'idx_assignments_assigned_by');
    table.dropIndex('assigned_at', 'idx_assignments_assigned_at');
    table.dropIndex('revoked_at', 'idx_assignments_revoked_at');
    table.dropIndex(['license_id', 'status'], 'idx_assignments_license_status');
  });

  // ==========================================================================
  // License Audit Events Table Indexes
  // ==========================================================================
  await knex.schema.table('license_audit_events', (table) => {
    table.dropIndex('entity_type', 'idx_audit_entity_type');
    table.dropIndex('entity_id', 'idx_audit_entity_id');
    table.dropIndex(['entity_type', 'entity_id'], 'idx_audit_entity');
    table.dropIndex('type', 'idx_audit_type');
    table.dropIndex('actor_id', 'idx_audit_actor_id');
    table.dropIndex('created_at', 'idx_audit_created_at');
    table.dropIndex(['actor_id', 'created_at'], 'idx_audit_actor_time');
  });

  // ==========================================================================
  // User Profiles Table Indexes
  // ==========================================================================
  await knex.schema.table('user_profiles', (table) => {
    table.dropIndex('user_id', 'idx_profiles_user_id');
    table.dropIndex('last_login_at', 'idx_profiles_last_login_at');
    table.dropIndex('last_activity_at', 'idx_profiles_last_activity_at');
  });

  logger.info('Performance indexes removed');
}
