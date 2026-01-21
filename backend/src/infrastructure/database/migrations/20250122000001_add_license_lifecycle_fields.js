/**
 * Add license lifecycle management fields
 * Adds fields for renewal reminders, grace periods, auto-suspension, and lifecycle tracking
 */
export async function up(knex) {
  console.log('Adding license lifecycle management fields...');

  // Add lifecycle management fields to licenses table
  await knex.schema.alterTable('licenses', (table) => {
    // Renewal and notification tracking
    table.jsonb('renewal_reminders_sent').defaultTo('[]').comment('Array of sent reminder types (30days, 7days, 1day)');
    table.timestamp('last_renewal_reminder', { useTz: true }).nullable().comment('Timestamp of last renewal reminder sent');
    table.timestamp('renewal_due_date', { useTz: true }).nullable().comment('Calculated date when renewal is due');

    // Auto-suspension and grace period settings
    table.boolean('auto_suspend_enabled').defaultTo(false).comment('Whether to automatically suspend expired licenses');
    table.integer('grace_period_days').defaultTo(30).comment('Number of days grace period after expiration');
    table.timestamp('grace_period_end', { useTz: true }).nullable().comment('Calculated end of grace period');

    // Suspension and reactivation tracking
    table.text('suspension_reason').nullable().comment('Reason for license suspension');
    table.timestamp('suspended_at', { useTz: true }).nullable().comment('When license was suspended');
    table.timestamp('reactivated_at', { useTz: true }).nullable().comment('When license was reactivated');

    // Renewal history
    table.jsonb('renewal_history').defaultTo('[]').comment('History of renewal actions and dates');

    // Indexes for lifecycle queries
    table.index(['expires_at', 'auto_suspend_enabled'], 'idx_licenses_expiration_auto_suspend');
    table.index(['grace_period_end'], 'idx_licenses_grace_period_end');
    table.index(['status', 'suspended_at'], 'idx_licenses_status_suspended');
  });

  console.log('✅ License lifecycle fields added successfully');
}

/**
 * Remove license lifecycle management fields
 */
export async function down(knex) {
  console.log('Removing license lifecycle management fields...');

  // Remove lifecycle management fields from licenses table
  await knex.schema.alterTable('licenses', (table) => {
    table.dropIndex(['expires_at', 'auto_suspend_enabled'], 'idx_licenses_expiration_auto_suspend');
    table.dropIndex(['grace_period_end'], 'idx_licenses_grace_period_end');
    table.dropIndex(['status', 'suspended_at'], 'idx_licenses_status_suspended');

    table.dropColumn('renewal_reminders_sent');
    table.dropColumn('last_renewal_reminder');
    table.dropColumn('renewal_due_date');
    table.dropColumn('auto_suspend_enabled');
    table.dropColumn('grace_period_days');
    table.dropColumn('grace_period_end');
    table.dropColumn('suspension_reason');
    table.dropColumn('suspended_at');
    table.dropColumn('reactivated_at');
    table.dropColumn('renewal_history');
  });

  console.log('✅ License lifecycle fields removed successfully');
}