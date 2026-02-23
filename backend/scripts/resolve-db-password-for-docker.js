#!/usr/bin/env node
/**
 * Print plain POSTGRES_PASSWORD for Docker postgres service.
 * Loads .env from repo root; if POSTGRES_PASSWORD starts with "enc:", decrypts and prints plain; else prints as-is.
 * Run from repo root: POSTGRES_PASSWORD_PLAIN=$(cd backend && node scripts/resolve-db-password-for-docker.js) docker compose up -d
 * Uses only Node built-ins so it works without npm install (e.g. on host or in CI).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../.env');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const noop = () => {};
  const orig = process.stdout.write;
  process.stdout.write = noop;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq === -1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1).replace(/\\(.)/g, '$1');
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } finally {
    process.stdout.write = orig;
  }
}

loadEnv(rootEnv);

const raw = process.env.POSTGRES_PASSWORD || '';
if (!raw.startsWith('enc:')) {
  process.stdout.write(raw);
  process.exit(0);
}

const hexData = raw.slice(4);
const keyHex = process.env.ENCRYPTION_KEY;
if (!keyHex || keyHex.length !== 64) {
  console.error('ENCRYPTION_KEY must be 64 hex chars when using enc: password');
  process.exit(1);
}

const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';
const key = Buffer.from(keyHex, 'hex');
const combined = Buffer.from(hexData, 'hex');
const iv = combined.subarray(0, IV_LENGTH);
const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
decipher.setAAD(Buffer.from('db_password'));
decipher.setAuthTag(authTag);
let decrypted = decipher.update(encrypted);
decrypted += decipher.final('utf8');
process.stdout.write(decrypted);
