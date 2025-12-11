// Knex configuration file for CLI commands
import dotenv from 'dotenv';
// Suppress dotenv output
const originalStdoutWrite = process.stdout.write;
process.stdout.write = () => {};
dotenv.config();
process.stdout.write = originalStdoutWrite;

const config = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'abc_dashboard',
      user: process.env.POSTGRES_USER || 'abc_user',
      password: process.env.POSTGRES_PASSWORD || 'abc_password',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/infrastructure/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/infrastructure/database/seeds',
    },
  },

  staging: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/infrastructure/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/infrastructure/database/seeds',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: './src/infrastructure/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/infrastructure/database/seeds',
    },
  },

  test: {
    client: 'pg',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'abc_dashboard_test',
      user: process.env.POSTGRES_USER || 'abc_user',
      password: process.env.POSTGRES_PASSWORD || 'abc_password',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/infrastructure/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/infrastructure/database/seeds',
    },
  },
};

export default config;
