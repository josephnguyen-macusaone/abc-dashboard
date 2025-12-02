import mongoose from 'mongoose';
import logger from './logger.js';
import { config } from './config.js';

/**
 * Connect to MongoDB database
 */
const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s

  try {
    logger.database(
      `Attempting to connect to MongoDB... (attempt ${retryCount + 1}/${maxRetries})`
    );

    const conn = await mongoose.connect(config.MONGODB_URI, {
      // Modern MongoDB driver configuration
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      family: 4, // Use IPv4, skip trying IPv6
    });

    // MongoDB connected (silent success)

    // Handle connection events for better monitoring
    mongoose.connection.on('error', (error) => {
      logger.error(`MongoDB connection error: ${error.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.debug('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.debug('MongoDB reconnected successfully');
    });

    return conn;
  } catch (error) {
    logger.warn(
      `MongoDB connection attempt ${retryCount + 1}/${maxRetries} failed: ${error.message}`
    );

    if (retryCount < maxRetries) {
      logger.debug(`Retrying MongoDB connection in ${retryDelay}ms`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return connectDB(retryCount + 1);
    } else {
      logger.error(`MongoDB connection failed - max retries (${maxRetries}) exceeded`);
      logger.error('CRITICAL: Database connection required for application startup - exiting');
      process.exit(1);
    }
  }
};

/**
 * Close database connection
 */
const closeDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    logger.debug('MongoDB disconnected successfully');
  }
};

export default connectDB;
export { closeDB };
