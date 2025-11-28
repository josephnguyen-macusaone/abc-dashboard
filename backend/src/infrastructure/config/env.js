import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal startup logger to avoid circular dependencies
const startupLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
    winston.format.printf(
      ({ timestamp, level, message }) => `[${timestamp}][${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize({ all: true })),
    }),
  ],
});

// Add startup method for consistency
startupLogger.startup = (message) => startupLogger.info(message);

// Load environment-specific configuration
const loadEnvironmentConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Define environment file paths (kebab-case naming)
  const envFiles = {
    development: path.join(__dirname, '../../../env/development.env'),
    production: path.join(__dirname, '../../../env/production.env'),
    staging: path.join(__dirname, '../../../env/staging.env'),
    test: path.join(__dirname, '../../../env/test.env'), // Separate test config
  };

  const envFile = envFiles[nodeEnv];

  // Check if environment file exists
  if (fs.existsSync(envFile)) {
    startupLogger.startup(`Loading environment config: ${envFile} (NODE_ENV=${nodeEnv})`);
    dotenv.config({ path: envFile });
  } else {
    startupLogger.warn(`Environment file not found: ${envFile}`);
    startupLogger.warn(
      `Make sure you have created the environment file or set environment variables manually`
    );
    startupLogger.startup(`Loading environment variables from system`);
    dotenv.config(); // Load from process.env
  }

  // Validate critical environment variables
  const requiredVars = ['JWT_SECRET'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    startupLogger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    startupLogger.error(`Please check your environment configuration`);
    process.exit(1);
  }

  // Set NODE_ENV if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = nodeEnv;
  }

  // Import logger after environment is loaded to avoid circular dependencies
  import('./logger.js')
    .then(({ default: logger }) => {
      logger.startup(`Environment loaded: ${nodeEnv.toUpperCase()}`);
    })
    .catch((err) => {
      startupLogger.warn(
        `Environment loaded: ${nodeEnv.toUpperCase()} (full logger not available: ${err.message})`
      );
    });
};

// Export the loader function
export { loadEnvironmentConfig };

// Auto-load environment configuration when this module is imported
loadEnvironmentConfig();
