#!/usr/bin/env node

import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../../knexfile.js';
import logger from '../../shared/utils/logger.js';

// Load environment variables
// Suppress dotenv output
const originalStdoutWrite = process.stdout.write;
process.stdout.write = () => {};
dotenv.config();
process.stdout.write = originalStdoutWrite;

const command = process.argv[2];
const argument = process.argv[3];

const env = process.env.NODE_ENV || 'development';
const config = knexConfig[env];

/**
 * Roll back all migrations. Returns total number of migrations rolled back.
 * @param {import('knex').Knex} db
 * @returns {Promise<number>}
 */
async function rollbackAll(db) {
  let rollbackCount = 0;
  let done = false;
  while (!done) {
    try {
      const [batchNo, rolledBack] = await db.migrate.rollback();
      if (rolledBack.length === 0) {
        done = true;
        break;
      }
      rollbackCount += rolledBack.length;
      logger.info(`Rolled back batch ${batchNo}: ${rolledBack.length} migrations`);
    } catch (error) {
      logger.warn('Error during rollback', { error: error.message });
      done = true;
    }
  }
  return rollbackCount;
}

/**
 * Run latest migrations and log result.
 * @param {import('knex').Knex} db
 */
async function runLatest(db) {
  const [batchNo, migrations] = await db.migrate.latest();
  if (migrations.length === 0) {
    logger.info('No migrations to run');
    return;
  }
  logger.info(`Batch ${batchNo} run: ${migrations.length} migrations`, {
    batch: batchNo,
    migrations,
  });
  migrations.forEach((m) => logger.info(`  - ${m}`));
}

async function handleFresh(db) {
  logger.info('Resetting database to clean state...');
  logger.info('Rolling back all migrations...');
  const rollbackCount = await rollbackAll(db);
  if (rollbackCount > 0) {
    logger.info('Total migrations rolled back', { count: rollbackCount });
  } else {
    logger.info('No migrations to rollback (database already clean)');
  }
  logger.info('Running fresh migrations...');
  await runLatest(db);
  logger.info('Fresh migration completed successfully');
}

async function handleMigrate(db) {
  logger.info('Running migrations...');
  const [batchNo, migrations] = await db.migrate.latest();
  if (migrations.length === 0) {
    logger.info('Already up to date');
  } else {
    logger.info(`Batch ${batchNo} run: ${migrations.length} migrations`, {
      batch: batchNo,
      migrations,
    });
    migrations.forEach((m) => logger.info(`  - ${m}`));
  }
  logger.info('Migrations completed successfully');
}

async function handleRollback(db) {
  const steps = argument ? parseInt(argument, 10) : 1;
  logger.info('Rolling back migrations...');
  for (let i = 0; i < steps; i++) {
    const [batchNo, rolledBack] = await db.migrate.rollback();
    if (rolledBack.length === 0) {
      logger.info('Nothing to rollback');
      break;
    }
    logger.info(`Batch ${batchNo} rolled back: ${rolledBack.length} migrations`);
    rolledBack.forEach((m) => logger.info(`  - ${m}`));
  }
  logger.info('Rollback completed successfully');
}

async function handleFreshSeed(db) {
  logger.info('Fresh migration + seeding...');
  logger.info('Rolling back all migrations...');
  const seedRollbackCount = await rollbackAll(db);
  if (seedRollbackCount > 0) {
    logger.info('Total migrations rolled back', { count: seedRollbackCount });
  } else {
    logger.info('No migrations to rollback (database already clean)');
  }
  logger.info('Running fresh migrations...');
  await runLatest(db);
  logger.info('Running seeds...');
  await db.seed.run();
  logger.info('Fresh migration + seeding completed successfully');
}

async function handleSeed(db) {
  if (argument) {
    logger.info('Running specific seed', { seed: argument });
    await db.seed.run({ specific: argument });
  } else {
    logger.info('Running all seeds...');
    await db.seed.run();
  }
  logger.info('Seed completed successfully');
}

async function handleStatus(db) {
  logger.info('Migration status:');
  const [completed, pending] = await Promise.all([
    db.migrate.list(),
    db('knex_migrations').select('*').orderBy('id'),
  ]);
  logger.info('Completed migrations:');
  if (pending.length === 0) {
    logger.info('  No migrations have been run yet');
  } else {
    pending.forEach((m) => logger.info(`  ${m.name} (batch ${m.batch})`));
  }
  const [_completedList, pendingList] = completed;
  if (pendingList && pendingList.length > 0) {
    logger.info('Pending migrations:');
    pendingList.forEach((m) => logger.info(`  ${m}`));
  } else {
    logger.info('No pending migrations');
  }
}

async function handleMake(db) {
  if (!argument) {
    logger.error('Please provide a migration name');
    logger.info('Usage: npm run migrate make <migration_name>');
    await db.destroy();
    process.exit(1);
  }
  logger.info('Creating migration', { name: argument });
  const name = await db.migrate.make(argument);
  logger.info('Created migration', { path: name });
}

function showUsage(_db) {
  logger.info('Usage:');
  logger.info('  npm run migrate              # Run all pending migrations');
  logger.info('  npm run migrate:fresh        # Drop all tables and run fresh migrations');
  logger.info('  npm run rollback             # Rollback last batch');
  logger.info('  npm run rollback 3           # Rollback last 3 batches');
  logger.info('  npm run seed                 # Run all seed files');
  logger.info('  npm run seed:fresh           # Drop all tables, run fresh migrations + seeds');
  logger.info('  npm run seed <filename>      # Run specific seed file');
  logger.info('  npm run db:status            # Show migration status');
}

async function main() {
  const db = knex(config);

  try {
    await db.raw('SELECT 1');
    logger.info('Connected to PostgreSQL database');

    switch (command) {
      case 'fresh':
        await handleFresh(db);
        break;
      case 'migrate':
      case undefined:
        await handleMigrate(db);
        break;
      case 'rollback':
        await handleRollback(db);
        break;
      case 'fresh-seed':
        await handleFreshSeed(db);
        break;
      case 'seed':
        await handleSeed(db);
        break;
      case 'status':
        await handleStatus(db);
        break;
      case 'make':
        await handleMake(db);
        break;
      default:
        showUsage(db);
        await db.destroy();
        process.exit(1);
    }

    await db.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Command failed', { error: error.message, stack: error.stack });
    await db.destroy();
    process.exit(1);
  }
}

main();
