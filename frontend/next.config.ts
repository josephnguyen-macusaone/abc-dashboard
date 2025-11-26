import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for traditional web server deployment
  output: 'export',
  trailingSlash: true,

  // Note: Rewrites are not supported in static export mode
  // API calls should be made directly to your backend server

  // Note: Headers are not supported in static export mode
  // CORS and authentication headers should be handled by your backend API server

  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
};

export default nextConfig;
