import { resolveDbPassword } from './resolve-db-password.js';

// Resolve DB password once (supports plain or enc:<hex> from encryptToHex with context 'db_password')
const resolvedDbPassword = resolveDbPassword(
  process.env.POSTGRES_PASSWORD || 'abc_password'
);

// Environment configuration
export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,

  // PostgreSQL Database configuration
  DATABASE_URL:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'abc_user'}:${encodeURIComponent(resolvedDbPassword)}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'abc_dashboard'}`,
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT) || 5432,
  POSTGRES_DB: process.env.POSTGRES_DB || 'abc_dashboard',
  POSTGRES_USER: process.env.POSTGRES_USER || 'abc_user',
  POSTGRES_PASSWORD: resolvedDbPassword,
  POSTGRES_POOL_MIN: parseInt(process.env.POSTGRES_POOL_MIN) || 2,
  POSTGRES_POOL_MAX: parseInt(process.env.POSTGRES_POOL_MAX) || 10,

  JWT_SECRET: process.env.JWT_SECRET || 'abc_dashboard',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h', // Access token expiration
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Refresh token expiration
  JWT_ISSUER: process.env.JWT_ISSUER || 'abc-dashboard',
  JWT_EMAIL_VERIFICATION_EXPIRES_IN: process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN || '24h', // Email verification expiration
  JWT_PASSWORD_RESET_EXPIRES_IN: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '10m', // Password reset expiration
  CLIENT_URL:
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://portal.abcsalon.us'
      : 'http://localhost:3000'),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12, // Optimized for performance and security balance

  // Email configuration
  EMAIL_SERVICE:
    process.env.EMAIL_SERVICE ??
    (process.env.NODE_ENV === 'development' ? 'mailhog' : 'google-workspace'),

  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@yourapp.com',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'ABC Dashboard',
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true' || false,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS, // App Password for Google Workspace

  // Cache configuration
  CACHE_USER_DATA_TTL: parseInt(process.env.CACHE_USER_DATA_TTL) || 1800, // 30 minutes
  CACHE_API_RESPONSE_TTL: parseInt(process.env.CACHE_API_RESPONSE_TTL) || 300, // 5 minutes
};

export default config;
