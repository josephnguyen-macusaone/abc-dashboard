#!/usr/bin/env node

/**
 * Comprehensive Email Testing Suite
 * Unified interface for all email testing operations
 *
 * Usage:
 *   npm run test:email:suite [command]
 *
 * Commands:
 *   config    - Validate email configuration
 *   send      - Test email sending
 *   templates - Test email templates
 *   health    - Check email service health
 *   all       - Run all tests (default)
 */

import '../src/infrastructure/config/env.js'; // Load environment first
import { config } from '../src/infrastructure/config/config.js';
import { EmailService } from '../src/shared/services/email-service.js';

const COMMANDS = {
  config: 'Validate email configuration',
  send: 'Test email sending functionality',
  templates: 'Test email templates',
  health: 'Check email service health',
  all: 'Run all email tests'
};

/**
 * Display help information
 */
function showHelp() {
  console.log('🚀 Email Testing Suite\n');
  console.log('Usage: npm run test:email:suite [command]\n');
  console.log('Available commands:');
  Object.entries(COMMANDS).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(10)} - ${desc}`);
  });
  console.log('\nExamples:');
  console.log('  npm run test:email:suite config');
  console.log('  npm run test:email:suite send');
  console.log('  npm run test:email:suite all\n');
}

/**
 * Validate email configuration
 */
async function testConfig() {
  console.log('🔍 Testing Email Configuration...\n');

  const issues = [];

  // Basic configuration checks
  if (!config.EMAIL_SERVICE) {
    issues.push('❌ EMAIL_SERVICE is required');
  } else {
    console.log(`✅ EMAIL_SERVICE: ${config.EMAIL_SERVICE}`);
  }

  if (!config.EMAIL_FROM) {
    issues.push('❌ EMAIL_FROM is required');
  } else {
    console.log(`✅ EMAIL_FROM: ${config.EMAIL_FROM}`);
  }

  // Service-specific validation
  console.log('🔍 Service Configuration:');
  switch (config.EMAIL_SERVICE) {
    case 'mailhog':
      console.log('   ✅ MailHog (Development) - Local email testing');
      console.log(`   📧 SMTP: ${config.EMAIL_HOST}:${config.EMAIL_PORT}`);
      console.log(`   🌐 Web UI: http://localhost:8025`);

      // Validate MailHog settings
      if (config.EMAIL_HOST !== 'localhost' && config.EMAIL_HOST !== 'mailhog') {
        issues.push('⚠️  EMAIL_HOST should be localhost or mailhog for MailHog');
      }
      if (config.EMAIL_PORT !== 1025) {
        issues.push('⚠️  EMAIL_PORT should be 1025 for MailHog SMTP');
      }
      if (config.EMAIL_SECURE !== false) {
        issues.push('⚠️  EMAIL_SECURE should be false for MailHog');
      }

      if (issues.length === 0) {
        console.log('   ✅ MailHog configuration validated');
      }
      break;

    case 'google-workspace':
      console.log('   ✅ Google Workspace (Production) - Gmail SMTP');
      console.log(`   📧 Account: ${config.EMAIL_USER || 'Not configured'}`);
      console.log(`   🌐 SMTP: ${config.EMAIL_HOST}:${config.EMAIL_PORT}`);

      if (!config.EMAIL_USER) issues.push('❌ EMAIL_USER required for Google Workspace');
      if (!config.EMAIL_PASS) issues.push('❌ EMAIL_PASS required for Google Workspace');
      if (config.EMAIL_HOST !== 'smtp.gmail.com') issues.push('⚠️  EMAIL_HOST should be smtp.gmail.com');
      if (config.EMAIL_PORT !== 587) issues.push('⚠️  EMAIL_PORT should be 587');

      if (!issues.length) {
        console.log('   ✅ Google Workspace configuration validated');
      }
      break;

    default:
      console.log(`   ⚠️  Unknown EMAIL_SERVICE: ${config.EMAIL_SERVICE || 'Not set'}`);
      issues.push(`❌ Invalid EMAIL_SERVICE: ${config.EMAIL_SERVICE || 'Not set'}`);
      issues.push('   Valid options: mailhog, google-workspace');
  }

  if (issues.length === 0) {
    console.log('\n🎉 Configuration validation passed!');
    return true;
  } else {
    console.log('\n❌ Configuration issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    return false;
  }
}

/**
 * Test email sending functionality
 */
async function testSending() {
  console.log('📤 Testing Email Sending...\n');

  // Display current configuration (safely)
  console.log('📧 Current Email Configuration:');
  console.log(`   Service: ${config.EMAIL_SERVICE || 'Not set'}`);
  console.log(`   Host: ${config.EMAIL_HOST}`);
  console.log(`   Port: ${config.EMAIL_PORT}`);
  console.log(`   Secure: ${config.EMAIL_SECURE}`);
  console.log(`   From: ${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`);

  // Show service-specific details
  switch (config.EMAIL_SERVICE) {
    case 'mailhog':
      console.log(`   📧 Status: Development - Local testing`);
      console.log(`   🌐 Web UI: http://localhost:8025`);
      break;
    case 'google-workspace':
      console.log(`   📧 Status: Production - Gmail SMTP`);
      console.log(`   👤 Account: ${config.EMAIL_USER || 'Not configured'}`);
      break;
    default:
      console.log(`   ⚠️  Status: Unknown service configuration`);
  }

  console.log(`   🔐 Auth: ${config.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}\n`);

  // Get recipient from command line or use default
  const recipient = process.argv[3] || 'test@example.com';

  try {
    console.log(`📤 Sending test email to: ${recipient}\n`);

    const emailService = new EmailService('email-suite-test');

    // Enhanced test email content with better formatting
    const testEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🧪 Email Suite Test</h2>
        <p>Hello!</p>
        <p>This is a test email from the comprehensive ABC Dashboard email testing suite.</p>

        <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>✅ Email System Working!</h3>
          <p><strong>Service:</strong> ${config.EMAIL_SERVICE || 'custom SMTP'}</p>
          <p><strong>Environment:</strong> ${config.NODE_ENV || 'development'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>

        <p>If you received this email, your email configuration is working correctly!</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This test email was sent by the ABC Dashboard Email Testing Suite.
        </p>
      </div>
    `;

    const result = await emailService.sendEmail(recipient, 'ABC Dashboard - Email Suite Test', testEmail);

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Recipient: ${recipient}`);
    console.log(`   Subject: ABC Dashboard - Email Suite Test`);

    if (config.EMAIL_SERVICE === 'mailhog' || config.EMAIL_HOST === 'localhost') {
      console.log('\n📬 Check your MailHog interface: http://localhost:8025');
    } else {
      console.log('\n📬 Check your email inbox for the test message.');
    }

    console.log('\n🎉 Email sending test completed successfully!');
    return true;
  } catch (error) {
    console.log('❌ Email sending failed!');
    console.log(`   Error: ${error.message}`);

    // Provide troubleshooting advice based on service
    console.log('\n🔧 Troubleshooting:');

    if (config.EMAIL_SERVICE === 'mailhog' || config.EMAIL_HOST === 'localhost') {
      console.log('1. Make sure MailHog is running: mailhog');
      console.log('2. Check MailHog web interface: http://localhost:8025');
      console.log('3. Verify EMAIL_HOST=localhost and EMAIL_PORT=1025 in your .env');
    } else if (config.EMAIL_SERVICE === 'google-workspace' || config.EMAIL_HOST === 'smtp.gmail.com') {
      console.log('1. Verify Google Workspace account has 2FA enabled');
      console.log('2. Check that EMAIL_USER and EMAIL_PASS are set correctly');
      console.log('3. Ensure EMAIL_PASS is an App Password, not your regular password');
      console.log('4. Check Google Workspace sending limits');
    } else {
      console.log('1. Verify SMTP server is running and accessible');
      console.log('2. Check EMAIL_HOST, EMAIL_PORT, and EMAIL_SECURE settings');
      console.log('3. Verify EMAIL_USER and EMAIL_PASS credentials');
      console.log('4. Check firewall settings for SMTP port access');
    }

    console.log('5. Review the Email Setup Guide: backend/docs/email-setup-guide.md');
    console.log('6. Check application logs for detailed error messages');

    return false;
  }
}

/**
 * Test email templates
 */
async function testTemplates() {
  console.log('📋 Testing Email Templates...\n');

  try {
    const emailService = new EmailService('email-suite-templates');

    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'TempPass123!',
      verificationUrl: 'https://app.com/verify?token=test123',
      loginUrl: 'https://app.com/login',
      displayName: 'Test User',
      temporaryPassword: 'TempPass123!',
      resetUrl: 'https://app.com/reset?token=test123'
    };

    console.log('Testing welcome email template...');
    const welcomeResult = await emailService.sendWelcomeWithPassword('template-test@example.com', testUser);
    console.log('✅ Welcome email sent');

    console.log('Testing verification email template...');
    const verifyResult = await emailService.sendEmailVerification('template-test@example.com', testUser);
    console.log('✅ Verification email sent');

    console.log('Testing password reset email template...');
    const resetResult = await emailService.sendPasswordResetEmail('template-test@example.com', testUser);
    console.log('✅ Password reset email sent');

    console.log('\n🎉 All email templates tested successfully!');
    return true;
  } catch (error) {
    console.log('❌ Template testing failed!');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Check email service health
 */
async function checkHealth() {
  console.log('💚 Checking Email Service Health...\n');

  try {
    const emailService = new EmailService('email-suite-health');

    const health = await emailService.getHealthStatus();
    console.log('Email Service Health Status:');
    console.log(`   Service: ${health.service}`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Last Checked: ${health.lastChecked}`);
    console.log(`   Response Time: ${health.responseTime}ms`);

    if (health.details) {
      console.log('   Details:', health.details);
    }

    const isHealthy = health.status === 'healthy';
    console.log(isHealthy ? '\n✅ Email service is healthy!' : '\n⚠️  Email service has issues');
    return isHealthy;
  } catch (error) {
    console.log('❌ Health check failed!');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Run all email tests
 */
async function runAllTests() {
  console.log('🚀 Running Complete Email Testing Suite...\n');

  const results = {
    config: false,
    health: false,
    send: false,
    templates: false
  };

  // Test configuration first
  console.log('=' * 50);
  results.config = await testConfig();

  // Test health
  console.log('\n' + '=' * 50);
  results.health = await checkHealth();

  // Test sending (only if config and health passed)
  if (results.config && results.health) {
    console.log('\n' + '=' * 50);
    results.send = await testSending();
  } else {
    console.log('\n⚠️  Skipping email sending test due to configuration/health issues');
  }

  // Test templates (only if config passed)
  if (results.config) {
    console.log('\n' + '=' * 50);
    results.templates = await testTemplates();
  } else {
    console.log('\n⚠️  Skipping template testing due to configuration issues');
  }

  // Summary
  console.log('\n' + '=' * 50);
  console.log('📊 Email Testing Suite Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${test.padEnd(10)}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);

  if (passedCount === totalCount) {
    console.log('🎉 All email tests passed! Email system is fully functional.');
  } else {
    console.log('⚠️  Some email tests failed. Check configuration and services.');
  }

  return passedCount === totalCount;
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'all';

  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  if (!COMMANDS[command]) {
    console.log(`❌ Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
  }

  console.log(`🚀 Email Testing Suite - Command: ${command}\n`);

  let success = false;

  switch (command) {
    case 'config':
      success = await testConfig();
      break;
    case 'send':
      success = await testSending();
      break;
    case 'templates':
      success = await testTemplates();
      break;
    case 'health':
      success = await checkHealth();
      break;
    case 'all':
      success = await runAllTests();
      break;
  }

  process.exit(success ? 0 : 1);
}

// Run the suite
main().catch(error => {
  console.error('💥 Email testing suite crashed:', error);
  process.exit(1);
});
