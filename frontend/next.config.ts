import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Generate a standalone server build so Docker can run `next start`
  output: "standalone",
  // Disable trailing slashes to prevent routing issues
  trailingSlash: false,

  // Disable typed routes due to compatibility issues with existing codebase
  // typedRoutes: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Turbopack configuration (required when using webpack config in Next.js 16)
  turbopack: {},

  // Enhanced experimental features
  experimental: {
    // Reduce memory usage during builds
    webpackBuildWorker: true,
    // Optimize CSS
    optimizeCss: true,
    // Scroll restoration
    scrollRestoration: true,
  },

  // Enhanced webpack configuration
  webpack: (config, { dev, isServer, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Improved bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks by package
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              enforce: true,
            },
            // Separate large libraries
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 20,
              enforce: true,
            },
            // React ecosystem
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|@tanstack)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 20,
              enforce: true,
            },
            // UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              name: 'ui-vendor',
              chunks: 'all',
              priority: 15,
              enforce: true,
            },
          },
        },
        // Minimize bundle size
        minimize: true,
        // Remove unused exports
        usedExports: true,
        // Enable module concatenation
        concatenateModules: true,
      };

      // Add compression plugins for production
      if (webpack.version && parseInt(webpack.version.split('.')[0]) >= 5) {
        const CompressionPlugin = require('compression-webpack-plugin');
        config.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8,
          })
        );
      }
    }

    // Development optimizations
    if (dev) {
      // Enable hot reloading optimizations
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: 1000,
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

  // Enhanced security and performance headers
  async headers() {
    return [
      {
        // API routes
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
      {
        // All routes - security headers
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Cache static assets aggressively
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Dynamic routes - no cache
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

// Export with bundle analyzer wrapper
export default bundleAnalyzer(nextConfig);
