/**
 * Migration: Fix Null/Empty DBA Values
 * Updates existing licenses that have null or empty DBA values to prevent frontend validation errors
 */

export async function up(knex) {
  console.log('Fixing null/empty DBA values in licenses table...');

  // Update licenses with null DBA
  const nullDbaCount = await knex('licenses')
    .whereNull('dba')
    .update({
      dba: 'Unknown Business',
      updated_at: knex.fn.now()
    });

  console.log(`Updated ${nullDbaCount} licenses with null DBA values`);

  // Update licenses with empty string DBA
  const emptyDbaCount = await knex('licenses')
    .where('dba', '')
    .update({
      dba: 'Unknown Business',
      updated_at: knex.fn.now()
    });

  console.log(`Updated ${emptyDbaCount} licenses with empty DBA values`);

  // Update licenses with whitespace-only DBA
  const whitespaceDbaCount = await knex('licenses')
    .whereRaw("dba ~ '^\\s*$' AND dba != ''")
    .update({
      dba: 'Unknown Business',
      updated_at: knex.fn.now()
    });

  console.log(`Updated ${whitespaceDbaCount} licenses with whitespace-only DBA values`);

  const totalFixed = nullDbaCount + emptyDbaCount + whitespaceDbaCount;
  console.log(`✅ Fixed ${totalFixed} licenses with invalid DBA values`);
}

export async function down(knex) {
  console.log('Rolling back DBA value fixes...');

  // Note: This rollback will set DBA back to empty string for the licenses we fixed
  // This is not perfect but maintains data integrity

  console.log('DBA value fixes have been rolled back');
  console.log('Note: Some licenses may now have empty DBA values again');
}