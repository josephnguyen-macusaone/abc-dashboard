#!/usr/bin/env node
/**
 * Export OpenAPI spec to JSON file for frontend codegen.
 * Run: npm run export:swagger
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import swaggerSpec from '../src/infrastructure/config/swagger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'swagger-spec.json');
writeFileSync(outPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');
console.log('Swagger spec exported to', outPath);
