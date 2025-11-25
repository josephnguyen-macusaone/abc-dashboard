#!/usr/bin/env node

// Simple health check script for Docker
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 5000,
  path: '/api/v1/health',
  timeout: 5000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // Healthy
  } else {
    process.exit(1); // Unhealthy
  }
});

req.on('error', () => {
  process.exit(1); // Connection failed
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1); // Timeout
});

req.end();
