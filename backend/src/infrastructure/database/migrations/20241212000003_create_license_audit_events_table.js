/**
 * Create license_audit_events table for tracking license-related actions
 */
export async function up(knex) {
  await knex.schema.createTable('license_audit_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Event type (e.g., 'license.created', 'license.revoked', 'assignment.created')
    table.string('type', 100).notNullable();

    // Actor who performed the action
    table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');

    // Entity affected (license_id or assignment_id)
    table.uuid('entity_id').notNullable();
    table.string('entity_type', 50).notNullable(); // 'license' or 'assignment'

    // Additional context as JSON
    table.jsonb('metadata').notNullable().defaultTo('{}');

    // IP address and user agent (optional)
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();

    // Timestamp
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Indexes for querying audit trail
    table.index('type');
    table.index('actor_id');
    table.index('entity_id');
    table.index('entity_type');
    table.index('created_at');
    table.index(['entity_type', 'entity_id', 'created_at']); // For entity history
    table.index(['actor_id', 'created_at']); // For user actions
    table.index(['type', 'created_at']); // For event type queries
  });

  // Create full-text search index for audit event search
  await knex.raw(`
    CREATE INDEX license_audit_events_search_idx ON license_audit_events 
    USING GIN (to_tsvector('english', 
      coalesce(type, '') || ' ' || 
      coalesce(metadata::text, '')
    ));
  `);

  // Create view for easy audit trail querying
  await knex.raw(`
    CREATE OR REPLACE VIEW license_audit_trail AS
    SELECT 
      lae.id,
      lae.type,
      lae.created_at,
      lae.entity_type,
      lae.entity_id,
      lae.metadata,
      lae.ip_address,
      u.id as actor_id,
      u.email as actor_email,
      u.display_name as actor_name,
      CASE 
        WHEN lae.entity_type = 'license' THEN l.key
        WHEN lae.entity_type = 'assignment' THEN la_ref.license_id::text
        ELSE NULL
      END as license_key,
      CASE 
        WHEN lae.entity_type = 'assignment' THEN u_assigned.email
        ELSE NULL
      END as assigned_user_email
    FROM license_audit_events lae
    LEFT JOIN users u ON lae.actor_id = u.id
    LEFT JOIN licenses l ON lae.entity_type = 'license' AND lae.entity_id = l.id
    LEFT JOIN license_assignments la_ref ON lae.entity_type = 'assignment' AND lae.entity_id = la_ref.id
    LEFT JOIN users u_assigned ON la_ref.user_id = u_assigned.id
    ORDER BY lae.created_at DESC;
  `);
}

export async function down(knex) {
  await knex.raw('DROP VIEW IF EXISTS license_audit_trail');
  await knex.schema.dropTableIfExists('license_audit_events');
}


