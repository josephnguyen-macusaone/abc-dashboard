'use strict';

/**
 * Change licenses.sms_balance from integer to decimal(10,2).
 * External API returns decimal values (e.g. 9.22, 93.7); integer column caused
 * "invalid input syntax for type integer" during sync.
 */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE licenses
    ALTER COLUMN sms_balance TYPE decimal(10,2)
    USING sms_balance::decimal(10,2);
  `);
}

export async function down(knex) {
  await knex.raw(`
    ALTER TABLE licenses
    ALTER COLUMN sms_balance TYPE integer
    USING FLOOR(sms_balance)::integer;
  `);
}
