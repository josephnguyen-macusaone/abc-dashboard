/**
 * Resolve POSTGRES_PASSWORD from env: plain or enc:&lt;hex&gt; (encrypted with ENCRYPTION_KEY).
 * Uses only crypto and process.env to avoid circular dependency with config/logger.
 */
import crypto from 'crypto';

const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';
const DB_PASSWORD_CONTEXT = 'db_password';

/**
 * Decrypt hex-encoded ciphertext (IV + authTag + ciphertext) using ENCRYPTION_KEY.
 * @param {string} hexData - Hex string from encryptToHex (same format as encryption.js)
 * @returns {string} Decrypted plaintext
 */
function decryptFromHex(hexData) {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters when using enc: password');
  }
  const key = Buffer.from(keyHex, 'hex');
  const combined = Buffer.from(hexData, 'hex');
  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted password: hex too short');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(DB_PASSWORD_CONTEXT));
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted);
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * @param {string} raw - process.env.POSTGRES_PASSWORD (plain or "enc:" + hex)
 * @returns {string} Plain password for DB connection
 */
export function resolveDbPassword(raw) {
  if (!raw) return '';
  if (raw.startsWith('enc:')) {
    return decryptFromHex(raw.slice(4));
  }
  return raw;
}
