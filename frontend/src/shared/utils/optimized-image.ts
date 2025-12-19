/**
 * Image optimization utilities
 * Provides utilities for optimizing image loading, sizing, and performance
 */

/**
 * Generate responsive image sizes for different breakpoints
 */
export const getResponsiveSizes = (
  breakpoints: { mobile: number; tablet?: number; desktop?: number } = {
    mobile: 640,
    tablet: 1024,
    desktop: 1920,
  }
): string => {
  const { mobile, tablet, desktop } = breakpoints;

  let sizes = `(max-width: 767px) ${mobile}px`;

  if (tablet) {
    sizes += `, (max-width: 1023px) ${tablet}px`;
  }

  if (desktop) {
    sizes += `, ${desktop}px`;
  }

  return sizes;
};

/**
 * Generate blur placeholder data URL
 */
export const generateBlurPlaceholder = (
  width: number = 400,
  height: number = 300,
  color: string = '#f3f4f6'
): string => {
  return `data:image/svg+xml;base64,${btoa(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
      <rect x="0" y="0" width="${width}" height="${height}" fill="${color}" opacity="0.8"/>
    </svg>`
  )}`;
};

/**
 * Image quality presets for different use cases
 */
export const IMAGE_QUALITY_PRESETS = {
  thumbnail: 75,
  preview: 85,
  standard: 90,
  high: 95,
  lossless: 100,
} as const;

/**
 * Get optimal quality based on image size and use case
 */
export const getOptimalQuality = (
  width: number,
  height: number,
  useCase: keyof typeof IMAGE_QUALITY_PRESETS = 'standard'
): number => {
  const area = width * height;

  // For very large images, reduce quality to save bandwidth
  if (area > 2000000) { // 2MP
    return Math.min(IMAGE_QUALITY_PRESETS[useCase], 85);
  }

  // For large images, use standard quality
  if (area > 500000) { // 500K
    return Math.min(IMAGE_QUALITY_PRESETS[useCase], 90);
  }

  // For smaller images, use higher quality
  return IMAGE_QUALITY_PRESETS[useCase];
};

/**
 * Avatar image optimization utilities
 */
export const AVATAR_SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 64,
  xl: 128,
  '2xl': 160,
} as const;

export const getAvatarSize = (size: keyof typeof AVATAR_SIZES = 'md'): number => {
  return AVATAR_SIZES[size];
};