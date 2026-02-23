/**
 * Convention-based registration for Awilix container.
 * Scans directories and registers classes by naming convention:
 * - SyncExternalLicensesUseCase -> syncExternalLicensesUseCase
 * - UserRepository -> userRepository
 *
 * Usage:
 *   const { createContainer, asClass, asValue } = require('awilix');
 *   const container = createContainer();
 *   registerByConvention(container, {
 *     useCases: 'src/application/use-cases',
 *     repositories: 'src/infrastructure/repositories',
 *   });
 */
import { asClass } from 'awilix';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Convert PascalCase to camelCase
 * SyncExternalLicensesUseCase -> syncExternalLicensesUseCase
 */
function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Recursively find all .js files in a directory
 */
function findJsFiles(dir, baseDir, files = []) {
  const fullPath = join(baseDir, dir);
  if (!statSync(fullPath, { throwIfNoEntry: false })?.isDirectory()) {
    return files;
  }
  const entries = readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = join(dir, entry.name);
    const _absPath = join(baseDir, relPath);
    if (entry.isDirectory()) {
      findJsFiles(relPath, baseDir, files);
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
      files.push(relPath);
    }
  }
  return files;
}

/**
 * Extract class name from file (assumes default export or single named export ending in UseCase/Repository)
 */
async function getExportFromFile(projectRoot, relPath) {
  const fullPath = join(projectRoot, relPath);
  const mod = await import(pathToFileURL(fullPath).href);
  if (mod.default && typeof mod.default === 'function') {
    return mod.default;
  }
  const exports = Object.keys(mod).filter((k) => typeof mod[k] === 'function');
  const classExport = exports.find(
    (k) =>
      k.endsWith('UseCase') ||
      k.endsWith('Repository') ||
      k.endsWith('Service') ||
      k.endsWith('Controller')
  );
  return classExport ? mod[classExport] : null;
}

/**
 * Register classes from directory by convention
 * @param {object} awilixContainer - Awilix container (from createContainer())
 * @param {object} pathMap - Map of registration prefix to directory path (relative to project root)
 * @param {string} projectRoot - Project root (default: backend root)
 */
export async function registerByConvention(awilixContainer, pathMap, projectRoot = null) {
  const root = projectRoot || join(__dirname, '../../..');

  for (const [_prefix, dirPath] of Object.entries(pathMap)) {
    const files = findJsFiles(dirPath, root);
    for (const file of files) {
      const Cls = await getExportFromFile(root, file);
      if (!Cls || !Cls.name) {
        continue;
      }

      const registrationName = toCamelCase(Cls.name);
      try {
        awilixContainer.register({
          [registrationName]: asClass(Cls).singleton(),
        });
      } catch (err) {
        // Skip if already registered (e.g. manual registration takes precedence)
        if (!err.message?.includes('already registered')) {
          throw err;
        }
      }
    }
  }
}

export default registerByConvention;
