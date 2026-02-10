'use strict';

export async function up(knex) {
  // Drop the SMS balance non-negative constraint to allow negative values from external API
  await knex.raw(`
    ALTER TABLE external_licenses
    DROP CONSTRAINT IF EXISTS chk_external_licenses_sms_balance_non_negative;
  `);
}

export async function down(knex) {
  // Re-add the constraint if rolling back
  await knex.raw(`
    ALTER TABLE external_licenses
    ADD CONSTRAINT chk_external_licenses_sms_balance_non_negative
    CHECK (sms_balance >= 0);
  `);
}