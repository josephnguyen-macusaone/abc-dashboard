// Environment configuration
export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,

  // Database configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/abc_dashboard',

  JWT_SECRET: process.env.JWT_SECRET || 'abc_dashboard',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h', // Access token expiration
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Refresh token expiration
  JWT_ISSUER: process.env.JWT_ISSUER || 'abc-dashboard',
  JWT_EMAIL_VERIFICATION_EXPIRES_IN: process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN || '24h', // Email verification expiration
  JWT_PASSWORD_RESET_EXPIRES_IN: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '10m', // Password reset expiration
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 14, // Increased from 12 for better security

  // Email configuration
  // Email service (define first so other email config can reference it)
  EMAIL_SERVICE:
    process.env.EMAIL_SERVICE ||
    (process.env.NODE_ENV === 'development' ? 'mailhog' : 'google-workspace'),

  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@yourapp.com',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'ABC Dashboard',
  EMAIL_HOST:
    process.env.EMAIL_HOST ||
    ((process.env.EMAIL_SERVICE || (process.env.NODE_ENV === 'development' ? 'mailhog' : 'google-workspace')) === 'mailhog'
      ? 'localhost'
      : 'smtp.gmail.com'),
  EMAIL_PORT:
    (process.env.EMAIL_SERVICE || (process.env.NODE_ENV === 'development' ? 'mailhog' : 'google-workspace')) === 'mailhog'
      ? 1025 // MailHog SMTP port
      : (process.env.EMAIL_SERVICE || (process.env.NODE_ENV === 'development' ? 'mailhog' : 'google-workspace')) === 'google-workspace'
        ? 587 // Google Workspace SMTP port (TLS)
        : parseInt(process.env.EMAIL_PORT) || (process.env.NODE_ENV === 'development' ? 1025 : 587),
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true' || false,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS, // App Password for Google Workspace

  // Cache configuration
  CACHE_USER_DATA_TTL: parseInt(process.env.CACHE_USER_DATA_TTL) || 1800, // 30 minutes
  CACHE_API_RESPONSE_TTL: parseInt(process.env.CACHE_API_RESPONSE_TTL) || 300, // 5 minutes
};

export default config;
