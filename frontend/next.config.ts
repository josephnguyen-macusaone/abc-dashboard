import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable trailing slashes to prevent routing issues
  trailingSlash: false,

  // Turbopack configuration (required when using webpack config in Next.js 16)
  turbopack: {},

  // Enable standalone output for optimized Docker builds
  // This creates a minimal production build with only required dependencies
  output: 'standalone',

  // Memory optimizations for large builds
  experimental: {
    // Reduce memory usage during builds
    webpackBuildWorker: true,
  },

  // Simplified webpack config to prevent memory issues
  webpack: (config, { dev, isServer }) => {
    // Only apply optimizations in production builds
    if (!dev && !isServer) {
      // Reduce bundle splitting complexity
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
          },
        },
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

export default nextConfig;
