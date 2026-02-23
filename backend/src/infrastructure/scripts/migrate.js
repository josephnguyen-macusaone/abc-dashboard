#!/usr/bin/env node

import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../../knexfile.js';
import logger from '../config/logger.js';

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

async function main() {
  const db = knex(config);

  try {
    // Test connection
    await db.raw('SELECT 1');
    logger.info('Connected to PostgreSQL database');

    switch (command) {
      case 'fresh': {
        logger.info('Resetting database to clean state...');

        // Rollback all migrations to get to a clean state
        logger.info('Rolling back all migrations...');
        let rollbackCount = 0;
        while (true) {
          try {
            const [batchNo, rolledBack] = await db.migrate.rollback();
            if (rolledBack.length === 0) {
              break; // No more migrations to rollback
            }
            rollbackCount += rolledBack.length;
            logger.info(`Rolled back batch ${batchNo}: ${rolledBack.length} migrations`);
          } catch (error) {
            logger.warn('Error during rollback', { error: error.message });
            break;
          }
        }

        if (rollbackCount > 0) {
          logger.info('Total migrations rolled back', { count: rollbackCount });
        } else {
          logger.info('No migrations to rollback (database already clean)');
        }

        logger.info('Running fresh migrations...');
        const [freshBatchNo, freshMigrations] = await db.migrate.latest();
        if (freshMigrations.length === 0) {
          logger.info('No migrations to run');
        } else {
          logger.info(`Batch ${freshBatchNo} run: ${freshMigrations.length} migrations`, {
            batch: freshBatchNo,
            migrations: freshMigrations,
          });
          freshMigrations.forEach((migration) => logger.info(`  - ${migration}`));
        }
        logger.info('Fresh migration completed successfully');
        break;
      }

      case 'migrate':
      case undefined: {
        // Default to migrate
        logger.info('Running migrations...');
        const [batchNo2, migrations2] = await db.migrate.latest();
        if (migrations2.length === 0) {
          logger.info('Already up to date');
        } else {
          logger.info(`Batch ${batchNo2} run: ${migrations2.length} migrations`, {
            batch: batchNo2,
            migrations: migrations2,
          });
          migrations2.forEach((migration) => logger.info(`  - ${migration}`));
        }
        logger.info('Migrations completed successfully');
        break;
      }

      case 'rollback': {
        const steps = argument ? parseInt(argument) : 1;
        logger.info('Rolling back migrations...');

        for (let i = 0; i < steps; i++) {
          const [batchNo, rolledBack] = await db.migrate.rollback();
          if (rolledBack.length === 0) {
            logger.info('Nothing to rollback');
            break;
          } else {
            logger.info(`Batch ${batchNo} rolled back: ${rolledBack.length} migrations`);
            rolledBack.forEach((migration) => logger.info(`  - ${migration}`));
          }
        }

        logger.info('Rollback completed successfully');
        break;
      }

      case 'fresh-seed': {
        logger.info('Fresh migration + seeding...');

        // First rollback all migrations
        logger.info('Rolling back all migrations...');
        let seedRollbackCount = 0;
        while (true) {
          try {
            const [batchNo, rolledBack] = await db.migrate.rollback();
            if (rolledBack.length === 0) {
              break; // No more migrations to rollback
            }
            seedRollbackCount += rolledBack.length;
            logger.info(`Rolled back batch ${batchNo}: ${rolledBack.length} migrations`);
          } catch (error) {
            logger.warn('Error during rollback', { error: error.message });
            break;
          }
        }

        if (seedRollbackCount > 0) {
          logger.info('Total migrations rolled back', { count: seedRollbackCount });
        } else {
          logger.info('No migrations to rollback (database already clean)');
        }

        // Now run fresh migrations
        logger.info('Running fresh migrations...');
        const [seedBatchNo, seedMigrations] = await db.migrate.latest();
        if (seedMigrations.length === 0) {
          logger.info('No migrations to run');
        } else {
          logger.info(`Batch ${seedBatchNo} run: ${seedMigrations.length} migrations`, {
            batch: seedBatchNo,
            migrations: seedMigrations,
          });
          seedMigrations.forEach((migration) => logger.info(`  - ${migration}`));
        }

        // Now run seeds
        logger.info('Running seeds...');
        await db.seed.run();
        logger.info('Fresh migration + seeding completed successfully');
        break;
      }

      case 'seed':
        if (argument) {
          logger.info('Running specific seed', { seed: argument });
          await db.seed.run({ specific: argument });
        } else {
          logger.info('Running all seeds...');
          await db.seed.run();
        }
        logger.info('Seed completed successfully');
        break;

      case 'status': {
        logger.info('Migration status:');
        const [completed, pending] = await Promise.all([
          db.migrate.list(),
          db('knex_migrations').select('*').orderBy('id'),
        ]);

        logger.info('Completed migrations:');
        if (pending.length === 0) {
          logger.info('  No migrations have been run yet');
        } else {
          pending.forEach((m) => {
            logger.info(`  ${m.name} (batch ${m.batch})`);
          });
        }

        const [_completedList, pendingList] = completed;
        if (pendingList && pendingList.length > 0) {
          logger.info('Pending migrations:');
          pendingList.forEach((m) => {
            logger.info(`  ${m}`);
          });
        } else {
          logger.info('No pending migrations');
        }
        break;
      }

      case 'make': {
        if (!argument) {
          logger.error('Please provide a migration name');
          logger.info('Usage: npm run migrate make <migration_name>');
          await db.destroy();
          process.exit(1);
        }
        logger.info('Creating migration', { name: argument });
        const name = await db.migrate.make(argument);
        logger.info('Created migration', { path: name });
        break;
      }

      default:
        logger.info('Usage:');
        logger.info('  npm run migrate              # Run all pending migrations');
        logger.info('  npm run migrate:fresh        # Drop all tables and run fresh migrations');
        logger.info('  npm run rollback             # Rollback last batch');
        logger.info('  npm run rollback 3           # Rollback last 3 batches');
        logger.info('  npm run seed                 # Run all seed files');
        logger.info(
          '  npm run seed:fresh           # Drop all tables, run fresh migrations + seeds'
        );
        logger.info('  npm run seed <filename>      # Run specific seed file');
        logger.info('  npm run db:status            # Show migration status');
        await db.destroy();
        process.exit(1);
    }

    // Close database connection and exit successfully
    await db.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Command failed', { error: error.message, stack: error.stack });
    await db.destroy();
    process.exit(1);
  }
}

main();
