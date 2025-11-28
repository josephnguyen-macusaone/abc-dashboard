/**
 * Auto-generated Asset Constants
 *
 * ⚠️  DO NOT EDIT MANUALLY!
 *
 * Regenerate: npm run generate:assets
 * Watch mode: npm run generate:assets:watch
 *
 * Generated: 2025-11-28T07:08:04.020Z
 *
 * Usage:
 *   import { SVGS, IMAGES } from '@/shared/constants';
 *   <Image src={SVGS.common.logoDark} alt="Logo" />
 */

// ============================================================================
// SVG Assets
// ============================================================================
export const SVGS = {
  common: {
    logoDark: '@assets/svgs/common/logo_dark.svg',
    logoLight: '@assets/svgs/common/logo_light.svg',
  },
} as const;

// ============================================================================
// Image Assets
// ============================================================================
export const IMAGES = {

} as const;

// ============================================================================
// Combined Assets Export
// ============================================================================
export const ASSETS = {
  svgs: SVGS,
  images: IMAGES,
} as const;

// ============================================================================
// Type Definitions
// ============================================================================
export type SvgAssetPaths = typeof SVGS;
export type ImageAssetPaths = typeof IMAGES;
export type AssetPaths = typeof ASSETS;

// Helper type to extract all asset paths as a union
type DeepValues<T> = T extends object
  ? { [K in keyof T]: DeepValues<T[K]> }[keyof T]
  : T;

export type SvgPath = DeepValues<SvgAssetPaths>;
export type ImagePath = DeepValues<ImageAssetPaths>;

export default ASSETS;
