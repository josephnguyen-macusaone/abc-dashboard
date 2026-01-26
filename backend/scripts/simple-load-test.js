/**
 * Simple Load Testing Script for ABC Dashboard API
 * Uses Node.js and autocannon for basic load testing
 */

import autocannon from 'autocannon';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test scenarios
const scenarios = [
  {
    name: 'Dashboard Metrics',
    url: `${API_BASE}/licenses/dashboard/metrics`,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer TOKEN_PLACEHOLDER',
      'Content-Type': 'application/json'
    },
    connections: 10,
    duration: 30,
    expectedStatus: 200
  },
  {
    name: 'License List',
    url: `${API_BASE}/licenses?page=1&limit=20`,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer TOKEN_PLACEHOLDER',
      'Content-Type': 'application/json'
    },
    connections: 15,
    duration: 30,
    expectedStatus: 200
  },
  {
    name: 'License Creation',
    url: `${API_BASE}/licenses`,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer TOKEN_PLACEHOLDER',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: 'LOAD-TEST-{timestamp}',
      product: 'Load Test Product',
      plan: 'Basic',
      status: 'active',
      term: 'monthly',
      seatsTotal: 10,
      startsAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-12-31T23:59:59Z',
      dba: 'Load Test Business',
      zip: '12345',
      emailLicense: 'loadtest-{timestamp}@example.com'
    }),
    connections: 5, // Lower for writes
    duration: 20,
    expectedStatus: 200
  }
];

// Authentication
async function getAuthToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Admin123!'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.data.tokens.accessToken;
    }
  } catch (error) {
    console.error('Failed to authenticate:', error.message);
  }
  return null;
}

// Run load test for a scenario
async function runLoadTest(scenario, authToken) {
  return new Promise((resolve) => {
    console.log(`\n🚀 Running load test: ${scenario.name}`);
    console.log(`📍 URL: ${scenario.url}`);
    console.log(`👥 Connections: ${scenario.connections}`);
    console.log(`⏱️ Duration: ${scenario.duration}s`);

    // Replace token placeholder
    const headers = { ...scenario.headers };
    if (headers.Authorization) {
      headers.Authorization = headers.Authorization.replace('TOKEN_PLACEHOLDER', authToken);
    }

    // Replace timestamp placeholders in body
    let body = scenario.body;
    if (body && body.includes('{timestamp}')) {
      const timestamp = Date.now();
      body = body.replace(/\{timestamp\}/g, timestamp.toString());
    }

    const instance = autocannon({
      url: scenario.url,
      method: scenario.method,
      headers,
      body,
      connections: scenario.connections,
      duration: scenario.duration,
      // Reduce pipelining to avoid overwhelming
      pipelining: 1,
      // Setup request function for dynamic content
      setupRequest: (req) => {
        if (scenario.body && scenario.body.includes('{timestamp}')) {
          const timestamp = Date.now();
          req.body = scenario.body.replace(/\{timestamp\}/g, timestamp.toString());
        }
        return req;
      }
    }, (err, result) => {
      if (err) {
        console.error(`❌ Load test failed for ${scenario.name}:`, err.message);
        resolve(null);
        return;
      }

      // Analyze results
      const analysis = analyzeResults(scenario, result);
      console.log(`✅ Completed: ${scenario.name}`);
      console.log(`   📊 Requests/sec: ${result.requests.average.toFixed(2)}`);
      console.log(`   ⏱️ P95 latency: ${result.latency.p95}ms`);
      console.log(`   📈 Status: ${analysis.status}`);
      console.log(`   ⚠️ Errors: ${result.errors}`);

      resolve({ scenario: scenario.name, ...result, analysis });
    });

    // Progress updates
    autocannon.track(instance, {
      renderProgressBar: false,
      renderResultsTable: false,
      renderLatencyTable: false
    });
  });
}

// Analyze test results
function analyzeResults(scenario, result) {
  const analysis = {
    status: 'PASS',
    issues: []
  };

  // Check error rate
  const errorRate = (result.errors / result.requests.total) * 100;
  if (errorRate > 5) {
    analysis.status = 'FAIL';
    analysis.issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
  }

  // Check response time
  if (result.latency.p95 > 1000) {
    analysis.status = 'WARN';
    analysis.issues.push(`Slow P95 response: ${result.latency.p95}ms`);
  } else if (result.latency.p95 > 500) {
    analysis.status = 'WARN';
    analysis.issues.push(`Moderate P95 response: ${result.latency.p95}ms`);
  }

  // Check throughput
  if (result.requests.average < 10) {
    analysis.status = 'WARN';
    analysis.issues.push(`Low throughput: ${result.requests.average.toFixed(2)} req/sec`);
  }

  return analysis;
}

// Main test runner
async function runAllTests() {
  console.log('🧪 ABC Dashboard Load Test Suite');
  console.log('==================================');
  console.log(`Target: ${BASE_URL}`);

  // Get authentication token
  console.log('\n🔐 Authenticating...');
  const authToken = await getAuthToken();

  if (!authToken) {
    console.error('❌ Failed to authenticate. Cannot run load tests.');
    process.exit(1);
  }

  console.log('✅ Authentication successful');

  // Run all test scenarios
  const results = [];
  for (const scenario of scenarios) {
    const result = await runLoadTest(scenario, authToken);
    if (result) {
      results.push(result);
    }

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate summary report
  generateSummaryReport(results);
}

// Generate summary report
function generateSummaryReport(results) {
  console.log('\n📊 LOAD TEST SUMMARY REPORT');
  console.log('===========================');

  const summary = {
    totalTests: results.length,
    passed: 0,
    failed: 0,
    warnings: 0,
    totalRequests: 0,
    avgThroughput: 0,
    avgLatency: 0
  };

  results.forEach(result => {
    console.log(`\n🎯 ${result.scenario}`);
    console.log(`   Status: ${result.analysis.status}`);
    console.log(`   Requests/sec: ${result.requests.average.toFixed(2)}`);
    console.log(`   Total Requests: ${result.requests.total}`);
    console.log(`   P95 Latency: ${result.latency.p95}ms`);
    console.log(`   Errors: ${result.errors}`);

    if (result.analysis.issues.length > 0) {
      console.log(`   Issues: ${result.analysis.issues.join(', ')}`);
    }

    // Update summary
    summary.totalRequests += result.requests.total;
    summary.avgThroughput += result.requests.average;
    summary.avgLatency += result.latency.p95;

    switch (result.analysis.status) {
      case 'PASS':
        summary.passed++;
        break;
      case 'FAIL':
        summary.failed++;
        break;
      case 'WARN':
        summary.warnings++;
        break;
    }
  });

  console.log('\n🏁 OVERALL RESULTS');
  console.log('==================');
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`⚠️ Warnings: ${summary.warnings}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`📊 Total Requests: ${summary.totalRequests}`);
  console.log(`🚀 Average Throughput: ${(summary.avgThroughput / results.length).toFixed(2)} req/sec`);
  console.log(`⏱️ Average P95 Latency: ${Math.round(summary.avgLatency / results.length)}ms`);

  // Performance assessment
  const avgThroughput = summary.avgThroughput / results.length;
  const avgLatency = summary.avgLatency / results.length;

  console.log('\n🎯 PERFORMANCE ASSESSMENT');
  console.log('=========================');

  if (summary.failed === 0 && avgThroughput > 20 && avgLatency < 500) {
    console.log('🟢 EXCELLENT: System handles load well with good performance');
  } else if (summary.failed === 0 && avgThroughput > 10 && avgLatency < 800) {
    console.log('🟡 GOOD: System performs adequately under load');
  } else if (summary.failed > 0) {
    console.log('🔴 POOR: System has issues under load - investigate failures');
  } else {
    console.log('🟠 FAIR: System needs performance optimization');
  }

  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');

  if (avgLatency > 1000) {
    console.log('• Optimize database queries and add indexes');
  }
  if (avgThroughput < 10) {
    console.log('• Consider caching strategies');
  }
  if (summary.failed > 0) {
    console.log('• Investigate and fix failing endpoints');
  }
  if (summary.warnings > 0) {
    console.log('• Review warning conditions for optimization opportunities');
  }

  console.log('\n✅ Load testing completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Load test suite failed:', error);
    process.exit(1);
  });
}

export { runAllTests, runLoadTest };