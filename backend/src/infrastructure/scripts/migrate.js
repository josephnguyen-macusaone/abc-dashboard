#!/usr/bin/env node

import dotenv from 'dotenv';
import connectDB, { closeDB } from '../config/database.js';
import {
  runMigrations,
  rollbackMigrations,
  runSeeds,
  showMigrationStatus,
} from '../../shared/utils/migrations.js';

// Load environment variables
dotenv.config();

const command = process.argv[2];
const argument = process.argv[3];

async function main() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');

    switch (command) {
      case 'migrate':
      case undefined: // Default to migrate
        console.log('Running migrations...');
        await runMigrations();
        console.log('Migrations completed successfully');
        break;

      case 'rollback': {
        const steps = argument ? parseInt(argument) : 1;
        console.log(`Rolling back ${steps} migration(s)...`);
        await rollbackMigrations(steps);
        console.log('Rollback completed successfully');
        break;
      }

      case 'seed':
        if (argument) {
          console.log(`Running seed: ${argument}`);
          await runSeeds(argument);
        } else {
          console.log('Running all seeds...');
          await runSeeds();
        }
        console.log('Seed completed successfully');
        break;

      case 'status':
        console.log('Migration status:');
        await showMigrationStatus();
        break;

      default:
        console.log('Usage:');
        console.log('  npm run migrate              # Run all pending migrations');
        console.log('  npm run migrate:rollback     # Rollback last migration');
        console.log('  npm run migrate:rollback 3   # Rollback last 3 migrations');
        console.log('  npm run seed                 # Run all seed files');
        console.log('  npm run seed <filename>      # Run specific seed file');
        console.log('  npm run db:status            # Show migration status');
        await closeDB();
        process.exit(1);
    }

    // Close database connection and exit successfully
    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('Command failed:', error.message);
    await closeDB();
    process.exit(1);
  }
}

main();
