import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Disable trailing slashes to prevent routing issues
  trailingSlash: false,

  // Turbopack configuration (required when using webpack config in Next.js 16)
  turbopack: {},

  // Enable standalone output for optimized Docker builds
  // This creates a minimal production build with only required dependencies
  output: 'standalone',

  // Image optimization configuration
  images: {
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],

    // Configure device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],

    // Configure image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Remote patterns for external images (modern replacement for domains)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'https',
        hostname: '127.0.0.1',
        port: '3000',
      },
      // Add your production domains here
      // {
      //   protocol: 'https',
      //   hostname: 'your-cdn-domain.com',
      // },
      // {
      //   protocol: 'https',
      //   hostname: 'images.your-domain.com',
      // },
    ],

    // Enable image optimization features
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // Configure image quality options
    qualities: [75, 90, 95, 100],

    // Cache optimization
    minimumCacheTTL: 60, // 1 minute minimum cache
  },

  // Advanced optimizations for bundle size
  experimental: {
    // Reduce memory usage during builds
    webpackBuildWorker: true,

    // Optimize package imports - reduces bundle size by tree-shaking unused exports
    optimizePackageImports: [
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'recharts',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'date-fns',
      'zustand',
    ],

    // Enable Webpack build optimizations
    optimizeCss: true,

    // Enable scroll restoration
    scrollRestoration: true,

    // Web Vitals attribution for performance monitoring
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'FCP', 'TTFB'],
  },

  // Comprehensive webpack optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Production client-side optimizations
    if (!dev && !isServer) {
      // Aggressive code splitting and chunk optimization
      config.optimization = {
        ...config.optimization,

        // Enable module concatenation for better minification
        concatenateModules: true,

        // Minimize bundle size
        minimize: true,

        // Smart chunk splitting
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              enforce: true,
            },

            // React and related libraries
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 20,
              enforce: true,
            },

            // UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|@tanstack|lucide-react|recharts)[\\/]/,
              name: 'ui-vendor',
              chunks: 'all',
              priority: 15,
              enforce: true,
            },

            // Utility libraries
            utils: {
              test: /[\\/]node_modules[\\/](clsx|tailwind-merge|date-fns|nanoid)[\\/]/,
              name: 'utils-vendor',
              chunks: 'all',
              priority: 5,
            },

            // Large libraries that should be separate
            heavy: {
              test: /[\\/]node_modules[\\/](recharts|@faker-js)[\\/]/,
              name: 'heavy-vendor',
              chunks: 'async', // Only load when needed
              priority: 25,
            },
          },
        },

        // Runtime chunk for better caching
        runtimeChunk: {
          name: 'runtime',
        },
      };

      // Add compression plugins for production
      if (webpack) {
        const CompressionPlugin = require('compression-webpack-plugin');
        config.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240, // Only compress files larger than 10KB
            minRatio: 0.8,
          })
        );
      }
    }

    // Development optimizations
    if (dev && !isServer) {
      // Enable fast refresh optimizations
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: false,
      };
    }

    return config;
  },

  // Proxy configuration for API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*', // Keep local API routes as-is
      },
    ];
  },

  // Add headers for CORS and authentication
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
