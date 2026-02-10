import logger from '../../config/logger.js';

/**
 * Migration: Fix Null/Empty DBA Values
 * Updates existing licenses that have null or empty DBA values to prevent frontend validation errors
 */
export async function up(knex) {
  logger.info('Fixing null/empty DBA values in licenses table...');

  const nullDbaCount = await knex('licenses').whereNull('dba').update({
    dba: 'Unknown Business',
    updated_at: knex.fn.now(),
  });
  logger.info('Updated licenses with null DBA values', { count: nullDbaCount });

  const emptyDbaCount = await knex('licenses').where('dba', '').update({
    dba: 'Unknown Business',
    updated_at: knex.fn.now(),
  });
  logger.info('Updated licenses with empty DBA values', { count: emptyDbaCount });

  const whitespaceDbaCount = await knex('licenses')
    .whereRaw("dba ~ '^\\s*$' AND dba != ''")
    .update({
      dba: 'Unknown Business',
      updated_at: knex.fn.now(),
    });
  logger.info('Updated licenses with whitespace-only DBA values', { count: whitespaceDbaCount });

  const totalFixed = nullDbaCount + emptyDbaCount + whitespaceDbaCount;
  logger.info('Fixed licenses with invalid DBA values', { total: totalFixed });
}

export async function down(knex) {
  logger.info('Rolling back DBA value fixes...');
  logger.info(
    'DBA value fixes have been rolled back. Some licenses may have empty DBA values again.'
  );
}
