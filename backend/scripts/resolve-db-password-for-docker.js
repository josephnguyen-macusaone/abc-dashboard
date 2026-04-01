#!/usr/bin/env node
/**
 * Prints plain POSTGRES_PASSWORD for tooling that expects stdout (e.g. shell export).
 * Implementation lives in repo root scripts/deploy.sh (embedded Node); this delegates via bash.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const deploySh = path.join(repoRoot, 'scripts/deploy.sh');

const result = spawnSync('bash', [deploySh, '_print-pg-password'], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

if (result.stderr) {
  process.stderr.write(result.stderr);
}
if (result.stdout) {
  process.stdout.write(result.stdout);
}
process.exit(result.status ?? 1);
