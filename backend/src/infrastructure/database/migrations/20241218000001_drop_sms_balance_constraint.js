'use strict';

export async function up(knex) {
  // Drop the SMS balance non-negative constraint to allow negative values from external API
  await knex.raw(`
    ALTER TABLE external_licenses
    DROP CONSTRAINT IF EXISTS chk_external_licenses_sms_balance_non_negative;
  `);
}

export async function down(_knex) {
  // No-op: do not re-add the constraint. The external API returns negative sms_balance
  // values, so re-adding CHECK (sms_balance >= 0) would fail on existing data.
  // Rollback succeeds; the constraint remains dropped.
}
