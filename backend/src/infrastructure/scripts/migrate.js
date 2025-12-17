#!/usr/bin/env node

import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from '../../../knexfile.js';

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
    console.log('Connected to PostgreSQL database');

    switch (command) {
      case 'fresh':
        console.log('🔄 Resetting database to clean state...');

        // Rollback all migrations to get to a clean state
        console.log('Rolling back all migrations...');
        let rollbackCount = 0;
        while (true) {
          try {
            const [batchNo, rolledBack] = await db.migrate.rollback();
            if (rolledBack.length === 0) {
              break; // No more migrations to rollback
            }
            rollbackCount += rolledBack.length;
            console.log(`  ✅ Rolled back batch ${batchNo}: ${rolledBack.length} migrations`);
          } catch (error) {
            console.log(`  ⚠️  Error during rollback: ${error.message}`);
            break;
          }
        }

        if (rollbackCount > 0) {
          console.log(`  📊 Total migrations rolled back: ${rollbackCount}`);
        } else {
          console.log('  📊 No migrations to rollback (database already clean)');
        }

        console.log('Running fresh migrations...');
        const [freshBatchNo, freshMigrations] = await db.migrate.latest();
        if (freshMigrations.length === 0) {
          console.log('No migrations to run');
        } else {
          console.log(`Batch ${freshBatchNo} run: ${freshMigrations.length} migrations`);
          freshMigrations.forEach((migration) => console.log(`  - ${migration}`));
        }
        console.log('✅ Fresh migration completed successfully');
        break;

      case 'migrate':
      case undefined: // Default to migrate
        console.log('Running migrations...');
        const [batchNo2, migrations2] = await db.migrate.latest();
        if (migrations2.length === 0) {
          console.log('Already up to date');
        } else {
          console.log(`Batch ${batchNo2} run: ${migrations2.length} migrations`);
          migrations2.forEach((migration) => console.log(`  - ${migration}`));
        }
        console.log('Migrations completed successfully');
        break;

      case 'rollback': {
        const steps = argument ? parseInt(argument) : 1;
        console.log(`Rolling back migrations...`);

        for (let i = 0; i < steps; i++) {
          const [batchNo, rolledBack] = await db.migrate.rollback();
          if (rolledBack.length === 0) {
            console.log('Nothing to rollback');
            break;
          } else {
            console.log(`Batch ${batchNo} rolled back: ${rolledBack.length} migrations`);
            rolledBack.forEach((migration) => console.log(`  - ${migration}`));
          }
        }

        console.log('Rollback completed successfully');
        break;
      }

      case 'fresh-seed':
        console.log('🔄 Fresh migration + seeding...');

        // First rollback all migrations
        console.log('Rolling back all migrations...');
        let seedRollbackCount = 0;
        while (true) {
          try {
            const [batchNo, rolledBack] = await db.migrate.rollback();
            if (rolledBack.length === 0) {
              break; // No more migrations to rollback
            }
            seedRollbackCount += rolledBack.length;
            console.log(`  ✅ Rolled back batch ${batchNo}: ${rolledBack.length} migrations`);
          } catch (error) {
            console.log(`  ⚠️  Error during rollback: ${error.message}`);
            break;
          }
        }

        if (seedRollbackCount > 0) {
          console.log(`  📊 Total migrations rolled back: ${seedRollbackCount}`);
        } else {
          console.log('  📊 No migrations to rollback (database already clean)');
        }

        // Now run fresh migrations
        console.log('Running fresh migrations...');
        const [seedBatchNo, seedMigrations] = await db.migrate.latest();
        if (seedMigrations.length === 0) {
          console.log('No migrations to run');
        } else {
          console.log(`Batch ${seedBatchNo} run: ${seedMigrations.length} migrations`);
          seedMigrations.forEach((migration) => console.log(`  - ${migration}`));
        }

        // Now run seeds
        console.log('🌱 Running seeds...');
        await db.seed.run();
        console.log('✅ Fresh migration + seeding completed successfully');
        break;

      case 'seed':
        if (argument) {
          console.log(`Running specific seed: ${argument}`);
          await db.seed.run({ specific: argument });
        } else {
          console.log('Running all seeds...');
          await db.seed.run();
        }
        console.log('Seed completed successfully');
        break;

      case 'status': {
        console.log('Migration status:');
        const [completed, pending] = await Promise.all([
          db.migrate.list(),
          db('knex_migrations').select('*').orderBy('id'),
        ]);

        console.log('\nCompleted migrations:');
        if (pending.length === 0) {
          console.log('  No migrations have been run yet');
        } else {
          pending.forEach((m) => {
            console.log(`  ✅ ${m.name} (batch ${m.batch})`);
          });
        }

        const [completedList, pendingList] = completed;
        if (pendingList && pendingList.length > 0) {
          console.log('\nPending migrations:');
          pendingList.forEach((m) => {
            console.log(`  ⏳ ${m}`);
          });
        } else {
          console.log('\nNo pending migrations');
        }
        break;
      }

      case 'make': {
        if (!argument) {
          console.error('Please provide a migration name');
          console.log('Usage: npm run migrate make <migration_name>');
          await db.destroy();
          process.exit(1);
        }
        console.log(`Creating migration: ${argument}`);
        const name = await db.migrate.make(argument);
        console.log(`Created migration: ${name}`);
        break;
      }

      default:
        console.log('Usage:');
        console.log('  npm run migrate              # Run all pending migrations');
        console.log('  npm run migrate:fresh        # Drop all tables and run fresh migrations');
        console.log('  npm run rollback             # Rollback last batch');
        console.log('  npm run rollback 3           # Rollback last 3 batches');
        console.log('  npm run seed                 # Run all seed files');
        console.log(
          '  npm run seed:fresh           # Drop all tables, run fresh migrations + seeds'
        );
        console.log('  npm run seed <filename>      # Run specific seed file');
        console.log('  npm run db:status            # Show migration status');
        await db.destroy();
        process.exit(1);
    }

    // Close database connection and exit successfully
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Command failed:', error.message);
    await db.destroy();
    process.exit(1);
  }
}

main();
