/**
 * Set licenses.agents_name default to empty string (JSONB "").
 * Application layer treats agentsName as string; this aligns DB default.
 */
export async function up(knex) {
  // JSONB empty string: in SQL we need '""' (two double-quote chars inside single quotes)
  await knex.raw("ALTER TABLE licenses ALTER COLUMN agents_name SET DEFAULT '\"\"'::jsonb");
}

export async function down(knex) {
  await knex.raw(`ALTER TABLE licenses ALTER COLUMN agents_name SET DEFAULT '[]'::jsonb`);
}
