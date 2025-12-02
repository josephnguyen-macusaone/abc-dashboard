import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../../infrastructure/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationManager {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../../../infrastructure/database/migrations');
    this.seedsPath = path.join(__dirname, '../../../infrastructure/database/seeds');
    this.migrationCollection = 'migrations';

    // Define Migration model once
    this.MigrationModel = mongoose.model(
      'Migration',
      new mongoose.Schema({
        name: { type: String, required: true, unique: true },
        appliedAt: { type: Date, default: Date.now },
      })
    );
  }

  // Ensure migration directories exist
  ensureDirectories() {
    if (!fs.existsSync(this.migrationsPath)) {
      fs.mkdirSync(this.migrationsPath, { recursive: true });
    }

    if (!fs.existsSync(this.seedsPath)) {
      fs.mkdirSync(this.seedsPath, { recursive: true });
    }
  }

  // Get list of migration files
  getMigrationFiles() {
    try {
      return fs
        .readdirSync(this.migrationsPath)
        .filter((file) => file.endsWith('.js'))
        .sort();
    } catch (error) {
      logger.error('Error reading migration files:', error);
      return [];
    }
  }

  // Get list of seed files
  getSeedFiles() {
    try {
      return fs
        .readdirSync(this.seedsPath)
        .filter((file) => file.endsWith('.js'))
        .sort();
    } catch (error) {
      logger.error('Error reading seed files:', error);
      return [];
    }
  }

  // Get applied migrations from database
  async getAppliedMigrations() {
    try {
      const applied = await this.MigrationModel.find({}, 'name').lean();
      return applied.map((m) => m.name);
    } catch (error) {
      logger.error('Error getting applied migrations:', error);
      return [];
    }
  }

  // Apply a single migration
  async applyMigration(filename) {
    try {
      const filePath = path.join(this.migrationsPath, filename);
      // Convert Windows paths to file:// URLs for ES modules
      const fileUrl = path.isAbsolute(filePath)
        ? `file://${filePath.replace(/\\/g, '/')}`
        : `file://${path.resolve(filePath).replace(/\\/g, '/')}`;

      const migration = await import(fileUrl);

      if (migration.up && typeof migration.up === 'function') {
        // Pass mongoose instance to the migration
        await migration.up(mongoose);
        return true;
      } else {
        logger.warn(`No 'up' function found in migration: ${filename}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to apply migration ${filename}:`, {
        error: error.message,
        stack: error.stack,
        code: error.code,
      });
      throw error;
    }
  }

  // Rollback a single migration
  async rollbackMigration(filename) {
    try {
      const filePath = path.join(this.migrationsPath, filename);
      // Convert Windows paths to file:// URLs for ES modules
      const fileUrl = path.isAbsolute(filePath)
        ? `file://${filePath.replace(/\\/g, '/')}`
        : `file://${path.resolve(filePath).replace(/\\/g, '/')}`;

      const migration = await import(fileUrl);

      if (migration.down && typeof migration.down === 'function') {
        // Pass mongoose instance to the migration
        await migration.down(mongoose);
        return true;
      } else {
        logger.warn(`No 'down' function found in migration: ${filename}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to rollback migration ${filename}:`, error);
      throw error;
    }
  }

  // Run all pending migrations
  async runMigrations() {
    this.ensureDirectories();

    const migrationFiles = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    const pendingMigrations = migrationFiles.filter((file) => !appliedMigrations.includes(file));

    if (pendingMigrations.length === 0) {
      return { applied: [], failed: [] };
    }

    const results = { applied: [], failed: [] };

    for (const filename of pendingMigrations) {
      try {
        await this.applyMigration(filename);

        // Record migration as applied
        await this.MigrationModel.create({ name: filename });
        results.applied.push(filename);
      } catch (error) {
        results.failed.push({ filename, error: error.message });
        logger.error(`Migration failed: ${filename}`, {
          error: error.message,
          stack: error.stack,
          code: error.code,
        });
      }
    }

    return results;
  }

  // Rollback last applied migration
  async rollbackLastMigration() {
    const appliedMigrations = await this.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      return false;
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1];

    try {
      await this.rollbackMigration(lastMigration);

      // Remove from applied migrations
      await this.MigrationModel.deleteOne({ name: lastMigration });

      return true;
    } catch (error) {
      logger.error(`Failed to rollback migration: ${lastMigration}`, error);
      return false;
    }
  }

  // Run seed data
  async runSeeds() {
    this.ensureDirectories();

    const seedFiles = this.getSeedFiles();

    if (seedFiles.length === 0) {
      return { seeded: [], failed: [] };
    }

    const results = { seeded: [], failed: [] };

    for (const filename of seedFiles) {
      try {
        const filePath = path.join(this.seedsPath, filename);
        // Convert Windows paths to file:// URLs for ES modules
        const fileUrl = path.isAbsolute(filePath)
          ? `file://${filePath.replace(/\\/g, '/')}`
          : `file://${path.resolve(filePath).replace(/\\/g, '/')}`;

        const seed = await import(fileUrl);

        if (seed.run && typeof seed.run === 'function') {
          // Pass mongoose instance to the seed
          await seed.run(mongoose);
          results.seeded.push(filename);
        } else {
          logger.warn(`No 'run' function found in seed: ${filename}`);
          results.failed.push({ filename, error: 'No run function found' });
        }
      } catch (error) {
        results.failed.push({ filename, error: error.message });
        logger.error(`Seed failed: ${filename}`, error);
      }
    }

    return results;
  }

  // Show migration status
  async showStatus() {
    this.ensureDirectories();

    const migrationFiles = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();

    const status = migrationFiles.map((filename) => ({
      name: filename,
      applied: appliedMigrations.includes(filename),
      appliedAt: appliedMigrations.includes(filename) ? appliedMigrations.indexOf(filename) : null,
    }));

    return {
      total: migrationFiles.length,
      applied: appliedMigrations.length,
      pending: migrationFiles.length - appliedMigrations.length,
      migrations: status,
    };
  }
}

// Create singleton instance
const migrationManager = new MigrationManager();

// Export individual functions for backward compatibility
export async function runMigrations() {
  return migrationManager.runMigrations();
}

export async function rollbackMigrations(steps = 1) {
  let rolledBack = 0;
  for (let i = 0; i < steps; i++) {
    const success = await migrationManager.rollbackLastMigration();
    if (!success) {
      break;
    }
    rolledBack++;
  }
  return { rolledBack };
}

export async function runSeeds(specificFile) {
  if (specificFile) {
    // Run specific seed file
    const seedFiles = migrationManager.getSeedFiles();
    if (!seedFiles.includes(specificFile)) {
      throw new Error(`Seed file not found: ${specificFile}`);
    }

    const filePath = path.join(migrationManager.seedsPath, specificFile);
    // Convert Windows paths to file:// URLs for ES modules
    const fileUrl = path.isAbsolute(filePath)
      ? `file://${filePath.replace(/\\/g, '/')}`
      : `file://${path.resolve(filePath).replace(/\\/g, '/')}`;

    const seed = await import(fileUrl);

    if (seed.run && typeof seed.run === 'function') {
      // Pass mongoose instance to the seed
      await seed.run(mongoose);
      return { seeded: [specificFile], failed: [] };
    } else {
      throw new Error(`No 'run' function found in seed: ${specificFile}`);
    }
  } else {
    // Run all seed files
    return migrationManager.runSeeds();
  }
}

export async function showMigrationStatus() {
  const status = await migrationManager.showStatus();

  logger.info('Migration status', {
    total: status.total,
    applied: status.applied,
    pending: status.pending,
  });

  // CLI output for human readability
  console.log(`Total migrations: ${status.total}`);
  console.log(`Applied: ${status.applied}`);
  console.log(`Pending: ${status.pending}`);
  console.log('\nMigration Status:');

  status.migrations.forEach((migration) => {
    const statusIcon = migration.applied ? '✅' : '⏳';
    console.log(`${statusIcon} ${migration.name}`);
  });

  return status;
}

export default MigrationManager;
