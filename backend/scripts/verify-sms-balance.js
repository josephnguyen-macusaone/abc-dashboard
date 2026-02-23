#!/usr/bin/env node
/**
 * Verify sms_balance in external_licenses and licenses tables.
 * Run from repo root: cd backend && npm run verify:sms-balance
 * Or in Docker: docker compose exec backend npm run verify:sms-balance
 */
import '../src/infrastructure/config/env.js';
import { resolveDbPassword } from '../src/infrastructure/config/resolve-db-password.js';
import knex from 'knex';

const config = {
  client: 'pg',
  connection: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'abc_dashboard',
    user: process.env.POSTGRES_USER || 'abc_user',
    password: resolveDbPassword(process.env.POSTGRES_PASSWORD || 'abc_password'),
  },
};

async function main() {
  const db = knex(config);

  try {
    console.log('\n=== external_licenses (sample with dba VALENCIA) ===\n');
    const ext = await db('external_licenses')
      .select('appid', 'dba', 'sms_balance', 'activate_date')
      .whereRaw("dba ILIKE '%VALENCIA%'")
      .limit(5);
    console.table(ext);

    console.log('\n=== licenses (sample with dba VALENCIA) ===\n');
    const lic = await db('licenses')
      .select('appid', 'dba', 'sms_balance', 'starts_at')
      .whereRaw("dba ILIKE '%VALENCIA%'")
      .limit(5);
    console.table(lic);

    const extWithBalance = await db('external_licenses')
      .where('sms_balance', '>', 0)
      .count('* as count')
      .first();
    const extTotal = await db('external_licenses').count('* as count').first();
    console.log(
      `\nexternal_licenses: ${extWithBalance?.count || 0} / ${extTotal?.count || 0} rows have sms_balance > 0\n`
    );
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
