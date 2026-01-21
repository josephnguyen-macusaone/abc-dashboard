/**
 * Load Testing Script for ABC Dashboard API
 * Tests API performance under various loads and scenarios
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const licenseCreationRate = new Trend('license_creation_duration');
const licenseQueryRate = new Trend('license_query_duration');
const dashboardMetricsRate = new Trend('dashboard_metrics_duration');

// Test configuration
export const options = {
  scenarios: {
    // Warm-up phase
    warm_up: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
        { duration: '1m', target: 10 },   // Stay at 10 users for 1 minute
      ],
      tags: { test_type: 'warm_up' },
    },

    // Normal load test
    normal_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
        { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
        { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
        { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users over 1 minute
      ],
      tags: { test_type: 'normal_load' },
    },

    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 200 },  // Ramp up to 200 users over 1 minute
        { duration: '3m', target: 200 },  // Stay at 200 users for 3 minutes
        { duration: '1m', target: 300 },  // Ramp up to 300 users over 1 minute
        { duration: '2m', target: 300 },  // Stay at 300 users for 2 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0 users over 1 minute
      ],
      tags: { test_type: 'stress_test' },
    },

    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 10 },  // Normal load
        { duration: '10s', target: 500 }, // Spike to 500 users
        { duration: '30s', target: 500 }, // Stay at spike
        { duration: '10s', target: 10 },  // Back to normal
        { duration: '1m', target: 10 },   // Stay at normal
      ],
      tags: { test_type: 'spike_test' },
    },

    // Endurance test
    endurance_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m', // Run for 30 minutes
      tags: { test_type: 'endurance_test' },
    },
  },

  thresholds: {
    // Overall thresholds
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate should be below 5%

    // Custom metrics
    errors: ['rate<0.05'], // Custom error rate below 5%
    license_creation_duration: ['p(95)<1000'], // License creation under 1s
    license_query_duration: ['p(95)<300'],     // License queries under 300ms
    dashboard_metrics_duration: ['p(95)<500'], // Dashboard metrics under 500ms
  },
};

// Base URL and test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test data
const testUsers = [
  { email: 'admin@example.com', password: 'Admin123!' },
  { email: 'manager@example.com', password: 'Manager123!' },
  { email: 'staff@example.com', password: 'Staff123!' },
];

const licenseTemplates = [
  {
    key: 'LIC-{timestamp}',
    product: 'Test Product {index}',
    plan: 'Basic',
    status: 'active',
    term: 'monthly',
    seatsTotal: 10,
    startsAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
    dba: 'Test Business {index}',
    zip: '12345',
    emailLicense: 'license{index}@example.com',
  },
];

// Authentication tokens cache
const authTokens = new Map();

// Setup function - runs before the test starts
export function setup() {
  console.log('🚀 Starting ABC Dashboard Load Test');
  console.log(`📍 Target URL: ${BASE_URL}`);
  console.log(`⏱️ Test Duration: ${options.scenarios.normal_load.duration || 'Variable'}`);

  // Pre-authenticate users
  for (const user of testUsers) {
    try {
      const response = http.post(`${API_BASE}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200) {
        const data = JSON.parse(response.body);
        authTokens.set(user.email, data.data.tokens.accessToken);
        console.log(`✅ Authenticated ${user.email}`);
      } else {
        console.log(`❌ Failed to authenticate ${user.email}: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Authentication error for ${user.email}: ${error.message}`);
    }
  }

  console.log(`🔑 Cached ${authTokens.size} authentication tokens`);

  return { authTokens: Object.fromEntries(authTokens) };
}

// Main test function
export default function (data) {
  // Get random auth token
  const tokens = Object.values(data.authTokens);
  const token = tokens[Math.floor(Math.random() * tokens.length)];

  if (!token) {
    console.error('❌ No auth token available');
    errorRate.add(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test different API endpoints based on VU ID
  const vuId = __VU;
  const scenarioTag = __ENV.K6_SCENARIO || 'unknown';

  switch (vuId % 5) {
    case 0:
      testDashboardMetrics(headers, scenarioTag);
      break;
    case 1:
      testLicenseQueries(headers, scenarioTag);
      break;
    case 2:
      testLicenseCreation(headers, scenarioTag);
      break;
    case 3:
      testLicenseUpdates(headers, scenarioTag);
      break;
    case 4:
      testBulkOperations(headers, scenarioTag);
      break;
  }

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Test dashboard metrics endpoint
function testDashboardMetrics(headers, scenarioTag) {
  const startTime = new Date().getTime();

  const response = http.get(`${API_BASE}/licenses/dashboard/metrics`, {
    headers,
    tags: { endpoint: 'dashboard_metrics', scenario: scenarioTag },
  });

  const duration = new Date().getTime() - startTime;
  dashboardMetricsRate.add(duration);

  const checkResult = check(response, {
    'dashboard metrics status is 200': (r) => r.status === 200,
    'dashboard metrics has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && data.data && data.data.metrics;
      } catch {
        return false;
      }
    },
    'dashboard metrics response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!checkResult) {
    errorRate.add(1);
    console.log(`❌ Dashboard metrics failed: ${response.status} - ${response.body}`);
  }
}

// Test license queries
function testLicenseQueries(headers, scenarioTag) {
  const startTime = new Date().getTime();

  // Random page and filters
  const params = new URLSearchParams({
    page: Math.floor(Math.random() * 10) + 1,
    limit: Math.floor(Math.random() * 50) + 10,
    status: Math.random() > 0.5 ? 'active' : '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const response = http.get(`${API_BASE}/licenses?${params}`, {
    headers,
    tags: { endpoint: 'license_query', scenario: scenarioTag },
  });

  const duration = new Date().getTime() - startTime;
  licenseQueryRate.add(duration);

  const checkResult = check(response, {
    'license query status is 200': (r) => r.status === 200,
    'license query has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && Array.isArray(data.data);
      } catch {
        return false;
      }
    },
    'license query response time < 300ms': (r) => r.timings.duration < 300,
  });

  if (!checkResult) {
    errorRate.add(1);
    console.log(`❌ License query failed: ${response.status} - ${response.body?.substring(0, 200)}`);
  }
}

// Test license creation
function testLicenseCreation(headers, scenarioTag) {
  const startTime = new Date().getTime();

  // Create a unique license
  const timestamp = new Date().getTime();
  const licenseData = {
    key: `LOAD-TEST-${timestamp}-${__VU}`,
    product: `Load Test Product ${__VU}`,
    plan: 'Basic',
    status: 'active',
    term: 'monthly',
    seatsTotal: Math.floor(Math.random() * 100) + 1,
    startsAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
    dba: `Load Test Business ${__VU}`,
    zip: '12345',
    emailLicense: `loadtest${timestamp}@example.com`,
  };

  const response = http.post(`${API_BASE}/licenses`, JSON.stringify(licenseData), {
    headers,
    tags: { endpoint: 'license_creation', scenario: scenarioTag },
  });

  const duration = new Date().getTime() - startTime;
  licenseCreationRate.add(duration);

  const checkResult = check(response, {
    'license creation status is 200': (r) => r.status === 200,
    'license creation has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && data.data && data.data.license;
      } catch {
        return false;
      }
    },
    'license creation response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!checkResult) {
    errorRate.add(1);
    console.log(`❌ License creation failed: ${response.status} - ${response.body?.substring(0, 200)}`);
  }
}

// Test license updates
function testLicenseUpdates(headers, scenarioTag) {
  // First get some licenses
  const listResponse = http.get(`${API_BASE}/licenses?page=1&limit=5`, { headers });

  if (listResponse.status !== 200) {
    console.log('❌ Could not get licenses for update test');
    errorRate.add(1);
    return;
  }

  try {
    const data = JSON.parse(listResponse.body);
    if (!data.success || !data.data || data.data.length === 0) {
      console.log('❌ No licenses available for update test');
      return;
    }

    // Pick a random license
    const license = data.data[Math.floor(Math.random() * data.data.length)];
    const updateData = {
      notes: `Load test update ${new Date().getTime()}`,
      seatsTotal: license.seatsTotal + 1,
    };

    const updateResponse = http.put(`${API_BASE}/licenses/${license.id}`, JSON.stringify(updateData), {
      headers,
      tags: { endpoint: 'license_update', scenario: scenarioTag },
    });

    const checkResult = check(updateResponse, {
      'license update status is 200': (r) => r.status === 200,
      'license update response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!checkResult) {
      errorRate.add(1);
      console.log(`❌ License update failed: ${updateResponse.status}`);
    }
  } catch (error) {
    console.log('❌ License update test error:', error.message);
    errorRate.add(1);
  }
}

// Test bulk operations (less frequent)
function testBulkOperations(headers, scenarioTag) {
  // Only run bulk operations for 10% of requests to avoid overwhelming the system
  if (Math.random() > 0.1) {
    return;
  }

  // Get some licenses for bulk update
  const listResponse = http.get(`${API_BASE}/licenses?page=1&limit=3`, { headers });

  if (listResponse.status !== 200) {
    return;
  }

  try {
    const data = JSON.parse(listResponse.body);
    if (!data.success || !data.data || data.data.length === 0) {
      return;
    }

    const licenseIds = data.data.map(l => l.id);
    const bulkUpdateData = {
      identifiers: { appids: licenseIds },
      updates: { notes: `Bulk load test ${new Date().getTime()}` },
    };

    const bulkResponse = http.patch(`${API_BASE}/licenses/bulk`, JSON.stringify(bulkUpdateData), {
      headers,
      tags: { endpoint: 'bulk_update', scenario: scenarioTag },
    });

    const checkResult = check(bulkResponse, {
      'bulk update status is 200': (r) => r.status === 200,
      'bulk update response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    if (!checkResult) {
      errorRate.add(1);
      console.log(`❌ Bulk update failed: ${bulkResponse.status}`);
    }
  } catch (error) {
    console.log('❌ Bulk operation test error:', error.message);
    errorRate.add(1);
  }
}

// Cleanup function - runs after the test completes
export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log(`📊 Final metrics summary:`);
  console.log(`   - Total requests: ${__ENV.K6_METRIC_HTTP_REQ_COUNT || 'N/A'}`);
  console.log(`   - Error rate: ${__ENV.K6_METRIC_ERRORS_RATE || 'N/A'}`);
  console.log(`   - P95 response time: ${__ENV.K6_METRIC_HTTP_REQ_DURATION_P95 || 'N/A'}ms`);
  console.log(`   - Max VUs reached: ${__ENV.K6_METRIC_VUS_MAX || 'N/A'}`);
}

// Handle summary - runs after all tests complete
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
    'load-test-summary.html': htmlReport(data),
  };

  return summary;
}

function textSummary(data, options) {
  return `
📊 ABC Dashboard Load Test Summary
=====================================

Test Duration: ${data.metrics.iteration_duration.values.avg}ms avg iteration
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%

🚀 Performance Metrics:
  • P95 Response Time: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
  • Average Response Time: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
  • Max Response Time: ${Math.round(data.metrics.http_req_duration.values.max)}ms

📈 Custom Metrics:
  • License Creation P95: ${Math.round(data.metrics.license_creation_duration?.values?.['p(95)'] || 0)}ms
  • License Query P95: ${Math.round(data.metrics.license_query_duration?.values?.['p(95)'] || 0)}ms
  • Dashboard Metrics P95: ${Math.round(data.metrics.dashboard_metrics_duration?.values?.['p(95)'] || 0)}ms

⚠️ Error Analysis:
  • HTTP Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
  • Custom Error Rate: ${(data.metrics.errors?.values?.rate * 100 || 0).toFixed(2)}%

🎯 Threshold Results:
${Object.entries(data.metrics)
  .filter(([key]) => key.includes('threshold'))
  .map(([key, value]) => `  • ${key}: ${value.values.passes}/${value.values.count}`)
  .join('\n')}

🔍 Recommendations:
${generateRecommendations(data)}
  `;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>ABC Dashboard Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .success { color: #28a745; }
    .warning { color: #ffc107; }
    .danger { color: #dc3545; }
    h1, h2 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>🚀 ABC Dashboard Load Test Report</h1>

  <div class="metric">
    <h2>📊 Overall Performance</h2>
    <p><strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}</p>
    <p><strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</p>
    <p><strong>P95 Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms</p>
    <p><strong>Average Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values.avg)}ms</p>
  </div>

  <div class="metric">
    <h2>📈 Custom Metrics</h2>
    <table>
      <tr><th>Operation</th><th>P95 Duration</th><th>Avg Duration</th></tr>
      <tr><td>License Creation</td><td>${Math.round(data.metrics.license_creation_duration?.values?.['p(95)'] || 0)}ms</td><td>${Math.round(data.metrics.license_creation_duration?.values?.avg || 0)}ms</td></tr>
      <tr><td>License Query</td><td>${Math.round(data.metrics.license_query_duration?.values?.['p(95)'] || 0)}ms</td><td>${Math.round(data.metrics.license_query_duration?.values?.avg || 0)}ms</td></tr>
      <tr><td>Dashboard Metrics</td><td>${Math.round(data.metrics.dashboard_metrics_duration?.values?.['p(95)'] || 0)}ms</td><td>${Math.round(data.metrics.dashboard_metrics_duration?.values?.avg || 0)}ms</td></tr>
    </table>
  </div>

  <div class="metric">
    <h2>⚠️ Threshold Results</h2>
    ${Object.entries(data.metrics)
      .filter(([key]) => key.includes('threshold'))
      .map(([key, value]) => {
        const passed = value.values.passes === value.values.count;
        return `<p class="${passed ? 'success' : 'danger'}">${key}: ${value.values.passes}/${value.values.count} ${passed ? '✅' : '❌'}</p>`;
      })
      .join('')}
  </div>

  <div class="metric">
    <h2>🔍 Recommendations</h2>
    <p>${generateRecommendations(data).replace(/\n/g, '<br>')}</p>
  </div>
</body>
</html>
  `;
}

function generateRecommendations(data) {
  const recommendations = [];

  const errorRate = data.metrics.http_req_failed.values.rate;
  const p95Duration = data.metrics.http_req_duration.values['p(95)'];

  if (errorRate > 0.05) {
    recommendations.push('❌ High error rate detected. Investigate failing endpoints.');
  } else {
    recommendations.push('✅ Error rate within acceptable limits.');
  }

  if (p95Duration > 500) {
    recommendations.push('⚠️ P95 response time is high. Consider optimizing slow endpoints.');
  } else {
    recommendations.push('✅ Response times are good.');
  }

  if (data.metrics.license_creation_duration?.values?.['p(95)'] > 1000) {
    recommendations.push('⚠️ License creation is slow. Check database indexes.');
  }

  if (data.metrics.license_query_duration?.values?.['p(95)'] > 300) {
    recommendations.push('⚠️ License queries are slow. Optimize database queries.');
  }

  return recommendations.join('\n');
}