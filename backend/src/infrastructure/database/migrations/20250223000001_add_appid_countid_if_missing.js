/**
 * Add appid and countid to licenses table if they don't exist.
 * Fixes sync errors: "column appid of relation licenses does not exist"
 * These columns are required for syncToInternalLicensesComprehensive to match
 * external licenses with internal ones.
 */
export async function up(knex) {
  const hasAppid = await knex.schema.hasColumn('licenses', 'appid');
  const hasCountid = await knex.schema.hasColumn('licenses', 'countid');

  if (!hasAppid || !hasCountid) {
    await knex.schema.alterTable('licenses', (table) => {
      if (!hasAppid) {
        table.string('appid', 255).nullable();
      }
      if (!hasCountid) {
        table.integer('countid').nullable();
      }
    });

    // Add indexes if we added the columns
    if (!hasAppid) {
      await knex.raw('CREATE INDEX IF NOT EXISTS licenses_appid_index ON licenses (appid)');
    }
    if (!hasCountid) {
      await knex.raw('CREATE INDEX IF NOT EXISTS licenses_countid_index ON licenses (countid)');
    }
  }
}

export async function down(knex) {
  // No-op: these columns may have been added by 20241217000001.
  // Rolling back would break sync; leave them in place.
}
