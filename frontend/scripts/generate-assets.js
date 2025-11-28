#!/usr/bin/env node

/**
 * Asset Generator Script
 * 
 * Scans the assets folder and generates TypeScript constants for:
 * - SVGs
 * - Images
 * - Fonts
 * 
 * Features:
 * - Watch mode for auto-regeneration
 * - Cross-platform paths (web & mobile)
 * - Nested folder support
 * - Type-safe TypeScript output
 * 
 * Usage:
 *   node scripts/generate-assets.js          # Generate once
 *   node scripts/generate-assets.js --watch  # Watch mode
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  assetsDir: path.join(__dirname, '../assets'),
  outputFile: path.join(__dirname, '../src/shared/constants/assets.ts'),
  // Base path for imports (works for both web and mobile)
  basePath: '@assets',
  watchMode: process.argv.includes('--watch') || process.argv.includes('-w'),
  debounceMs: 300,
};

// Supported file extensions
const EXTENSIONS = {
  svgs: ['.svg'],
  images: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp'],
  fonts: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
};

/**
 * Convert file path to camelCase key
 * e.g., "logo_dark" -> "logoDark"
 */
function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
}

/**
 * Sanitize string to valid JS identifier
 */
function toValidIdentifier(str) {
  // Remove extension and replace invalid chars
  const sanitized = str
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars
    .replace(/^(\d)/, '_$1') // Prefix if starts with number
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return toCamelCase(sanitized);
}

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir, baseDir, extensions) {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...scanDirectory(fullPath, baseDir, extensions));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (extensions.includes(ext)) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        results.push({
          name: item,
          path: relativePath,
          extension: ext,
        });
      }
    }
  }

  return results;
}

/**
 * Build nested object structure from file paths
 */
function buildNestedStructure(files, assetType) {
  const structure = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let current = structure;

    // Navigate/create nested folders
    for (let i = 0; i < parts.length - 1; i++) {
      const folderKey = toValidIdentifier(parts[i]);
      if (!current[folderKey]) {
        current[folderKey] = {};
      }
      current = current[folderKey];
    }

    // Add file entry
    const fileName = parts[parts.length - 1];
    const fileKey = toValidIdentifier(fileName);
    current[fileKey] = `${CONFIG.basePath}/${assetType}/${file.path}`;
  }

  return structure;
}

/**
 * Convert object to formatted TypeScript string
 */
function objectToTypeScript(obj, indent = 2) {
  const entries = Object.entries(obj);
  
  if (entries.length === 0) {
    return '';
  }

  const spaces = ' '.repeat(indent);
  const lines = [];

  for (const [key, value] of entries) {
    if (typeof value === 'object' && value !== null) {
      const nested = objectToTypeScript(value, indent + 2);
      if (nested) {
        lines.push(`${spaces}${key}: {`);
        lines.push(nested);
        lines.push(`${spaces}},`);
      } else {
        lines.push(`${spaces}${key}: {},`);
      }
    } else {
      lines.push(`${spaces}${key}: '${value}',`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate the TypeScript file content
 */
function generateFileContent(svgs, images, fonts) {
  const svgStructure = buildNestedStructure(svgs, 'svgs');
  const imageStructure = buildNestedStructure(images, 'images');
  const fontStructure = buildNestedStructure(fonts, 'fonts');

  const svgContent = objectToTypeScript(svgStructure);
  const imageContent = objectToTypeScript(imageStructure);
  const fontContent = objectToTypeScript(fontStructure);

  return `/**
 * Auto-generated Asset Constants
 * 
 * ⚠️  DO NOT EDIT MANUALLY!
 * 
 * Regenerate: npm run generate:assets
 * Watch mode: npm run generate:assets:watch
 * 
 * Generated: ${new Date().toISOString()}
 * 
 * Usage:
 *   import { SVGS, IMAGES, FONTS } from '@/shared/constants';
 *   <Image src={SVGS.common.logoDark} alt="Logo" />
 */

// ============================================================================
// SVG Assets
// ============================================================================
export const SVGS = {
${svgContent}
} as const;

// ============================================================================
// Image Assets  
// ============================================================================
export const IMAGES = {
${imageContent}
} as const;

// ============================================================================
// Font Assets
// ============================================================================
export const FONTS = {
${fontContent}
} as const;

// ============================================================================
// Combined Assets Export
// ============================================================================
export const ASSETS = {
  svgs: SVGS,
  images: IMAGES,
  fonts: FONTS,
} as const;

// ============================================================================
// Type Definitions
// ============================================================================
export type SvgAssetPaths = typeof SVGS;
export type ImageAssetPaths = typeof IMAGES;
export type FontAssetPaths = typeof FONTS;
export type AssetPaths = typeof ASSETS;

// Helper type to extract all asset paths as a union
type DeepValues<T> = T extends object
  ? { [K in keyof T]: DeepValues<T[K]> }[keyof T]
  : T;

export type SvgPath = DeepValues<SvgAssetPaths>;
export type ImagePath = DeepValues<ImageAssetPaths>;
export type FontPath = DeepValues<FontAssetPaths>;

export default ASSETS;
`;
}

/**
 * Main generation function
 */
function generateAssets() {
  const startTime = Date.now();
  
  console.log('🔍 Scanning assets directory...');

  const svgs = scanDirectory(
    path.join(CONFIG.assetsDir, 'svgs'),
    path.join(CONFIG.assetsDir, 'svgs'),
    EXTENSIONS.svgs
  );

  const images = scanDirectory(
    path.join(CONFIG.assetsDir, 'images'),
    path.join(CONFIG.assetsDir, 'images'),
    EXTENSIONS.images
  );

  const fonts = scanDirectory(
    path.join(CONFIG.assetsDir, 'fonts'),
    path.join(CONFIG.assetsDir, 'fonts'),
    EXTENSIONS.fonts
  );

  const total = svgs.length + images.length + fonts.length;
  
  console.log(`   📁 SVGs: ${svgs.length}`);
  console.log(`   📁 Images: ${images.length}`);
  console.log(`   📁 Fonts: ${fonts.length}`);

  // Generate content
  const content = generateFileContent(svgs, images, fonts);

  // Ensure output directory exists
  const outputDir = path.dirname(CONFIG.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(CONFIG.outputFile, content, 'utf-8');

  const duration = Date.now() - startTime;
  console.log(`✅ Generated ${total} asset(s) in ${duration}ms`);
  console.log(`   → ${CONFIG.outputFile}\n`);

  return { svgs, images, fonts };
}

/**
 * Watch mode with debouncing
 */
function watchAssets() {
  console.log('👀 Watch mode enabled\n');
  
  // Initial generation
  generateAssets();

  let debounceTimer = null;
  
  const handleChange = (eventType, filename) => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Debounce to avoid multiple rapid regenerations
    debounceTimer = setTimeout(() => {
      console.log(`\n🔄 Change detected: ${filename || 'unknown'}`);
      generateAssets();
    }, CONFIG.debounceMs);
  };

  // Watch each asset directory
  const directories = ['svgs', 'images', 'fonts'];
  
  for (const dir of directories) {
    const watchPath = path.join(CONFIG.assetsDir, dir);
    
    if (fs.existsSync(watchPath)) {
      fs.watch(watchPath, { recursive: true }, handleChange);
      console.log(`   Watching: assets/${dir}/`);
    }
  }

  console.log('\n📡 Waiting for changes... (Ctrl+C to stop)\n');
}

// ============================================================================
// Entry Point
// ============================================================================
if (CONFIG.watchMode) {
  watchAssets();
} else {
  generateAssets();
}
