/**
 * Store assigned agent login email in licenses.agents (was integer count).
 * Existing numeric values are preserved as text (e.g. 0 -> "0").
 */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE licenses
    ALTER COLUMN agents TYPE varchar(320)
    USING trim(COALESCE(agents::text, ''))
  `);
  await knex.raw(`ALTER TABLE licenses ALTER COLUMN agents SET DEFAULT ''`);
}

export async function down(knex) {
  await knex.raw(`
    ALTER TABLE licenses
    ALTER COLUMN agents TYPE integer
    USING CASE
      WHEN trim(COALESCE(agents, '')) ~ '^[0-9]+$' THEN trim(agents)::integer
      ELSE 0
    END
  `);
  await knex.raw('ALTER TABLE licenses ALTER COLUMN agents SET DEFAULT 0');
}
