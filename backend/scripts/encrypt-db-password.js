#!/usr/bin/env node
/**
 * Generate encrypted hex for POSTGRES_PASSWORD.
 * Usage: node scripts/encrypt-db-password.js [plain_password]
 * Default password: abc_password
 * Requires ENCRYPTION_KEY in .env (loads from repo root or backend .env).
 * Output: enc:<hex> — set POSTGRES_PASSWORD to this in .env.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../.env');
const backendEnv = path.resolve(__dirname, '../.env');

if (!process.env.ENCRYPTION_KEY) {
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else {
    dotenv.config({ path: backendEnv });
  }
}

if (!process.env.ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY must be set in .env (64 hex chars).');
  process.exit(1);
}

const plainPassword = process.argv[2] || 'abc_password';
const { encryptToHex } = await import('../src/shared/utils/security/encryption.js');
const hex = encryptToHex(plainPassword, 'db_password');
console.log(`enc:${hex}`);
