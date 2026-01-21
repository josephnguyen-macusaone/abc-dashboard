import crypto from 'crypto';
import logger from '../../../infrastructure/config/logger.js';

/**
 * Encryption Utilities
 * Provides encryption/decryption for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits for GCM
  tagLength: 16, // 128 bits authentication tag
};

// Get encryption key from environment or generate a random one (for development)
let encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }
  // Generate a random key for development (will change on restart)
  encryptionKey = crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
  logger.warn('Using randomly generated encryption key - this will change on restart');
} else if (typeof encryptionKey === 'string') {
  // Convert hex string to buffer
  encryptionKey = Buffer.from(encryptionKey, 'hex');
  if (encryptionKey.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`ENCRYPTION_KEY must be ${ENCRYPTION_CONFIG.keyLength} bytes (${ENCRYPTION_CONFIG.keyLength * 2} hex characters)`);
  }
}

/**
 * Encrypt sensitive data
 * @param {string} plaintext - Data to encrypt
 * @param {string} context - Optional context for key derivation
 * @returns {string} Encrypted data as base64 string with IV and auth tag
 */
export function encrypt(plaintext, context = '') {
  if (!plaintext) return null;

  try {
    // Generate random IV
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    // Create cipher
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, encryptionKey);
    cipher.setAAD(Buffer.from(context)); // Additional authenticated data

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV + auth tag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);

    return combined.toString('base64');

  } catch (error) {
    logger.error('Encryption failed', {
      error: error.message,
      context,
      dataLength: plaintext.length
    });
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data as base64 string
 * @param {string} context - Context used during encryption
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedData, context = '') {
  if (!encryptedData) return null;

  try {
    // Decode the combined data
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components (IV + auth tag + encrypted data)
    const iv = combined.subarray(0, ENCRYPTION_CONFIG.ivLength);
    const authTag = combined.subarray(ENCRYPTION_CONFIG.ivLength, ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength);
    const encrypted = combined.subarray(ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength);

    // Create decipher
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, encryptionKey);
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted);
    decrypted += decipher.final('utf8');

    return decrypted;

  } catch (error) {
    logger.error('Decryption failed', {
      error: error.message,
      context,
      dataLength: encryptedData.length
    });
    throw new Error('Decryption failed');
  }
}

/**
 * Hash sensitive data (one-way hashing for passwords, tokens, etc.)
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt
 * @returns {string} Hashed data as hex string
 */
export function hash(data, salt = null) {
  if (!data) return null;

  try {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha512');

    // Return salt + hash
    return saltBuffer.toString('hex') + ':' + hash.toString('hex');

  } catch (error) {
    logger.error('Hashing failed', { error: error.message });
    throw new Error('Hashing failed');
  }
}

/**
 * Verify hashed data
 * @param {string} data - Plain text data to verify
 * @param {string} hashedData - Previously hashed data (salt:hash format)
 * @returns {boolean} Whether the data matches the hash
 */
export function verifyHash(data, hashedData) {
  if (!data || !hashedData) return false;

  try {
    const [saltHex, hashHex] = hashedData.split(':');
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const hash = Buffer.from(hashHex, 'hex');

    const computedHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');

    return crypto.timingSafeEqual(hash, computedHash);

  } catch (error) {
    logger.error('Hash verification failed', { error: error.message });
    return false;
  }
}

/**
 * Generate a secure random token
 * @param {number} length - Length in bytes (default 32)
 * @returns {string} Random token as hex string
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Mask sensitive data for logging
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of characters to show at start and end
 * @returns {string} Masked data
 */
export function maskSensitiveData(data, visibleChars = 4) {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(data?.length || 0);
  }

  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const maskLength = data.length - (visibleChars * 2);

  return `${start}${'*'.repeat(maskLength)}${end}`;
}

/**
 * Security utilities for license data
 */
export const licenseSecurity = {
  /**
   * Encrypt sensitive license fields
   * @param {Object} licenseData - License data object
   * @returns {Object} License data with sensitive fields encrypted
   */
  encryptSensitiveFields(licenseData) {
    if (!licenseData) return licenseData;

    const encrypted = { ...licenseData };

    // Fields that should be encrypted
    const sensitiveFields = ['emailLicense', 'dba', 'zip', 'mid'];

    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        try {
          encrypted[field] = encrypt(encrypted[field], `license_${field}`);
        } catch (error) {
          logger.warn(`Failed to encrypt ${field}, keeping original`, {
            error: error.message,
            field
          });
        }
      }
    }

    return encrypted;
  },

  /**
   * Decrypt sensitive license fields
   * @param {Object} licenseData - License data object with encrypted fields
   * @returns {Object} License data with sensitive fields decrypted
   */
  decryptSensitiveFields(licenseData) {
    if (!licenseData) return licenseData;

    const decrypted = { ...licenseData };

    // Fields that should be decrypted
    const sensitiveFields = ['emailLicense', 'dba', 'zip', 'mid'];

    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        try {
          decrypted[field] = decrypt(decrypted[field], `license_${field}`);
        } catch (error) {
          logger.warn(`Failed to decrypt ${field}, keeping encrypted`, {
            error: error.message,
            field
          });
        }
      }
    }

    return decrypted;
  },

  /**
   * Sanitize license data for logging (mask sensitive fields)
   * @param {Object} licenseData - License data object
   * @returns {Object} Sanitized license data safe for logging
   */
  sanitizeForLogging(licenseData) {
    if (!licenseData) return licenseData;

    const sanitized = { ...licenseData };

    // Fields that should be masked
    const sensitiveFields = ['emailLicense', 'dba', 'zip', 'mid'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = maskSensitiveData(sanitized[field]);
      }
    }

    return sanitized;
  },
};