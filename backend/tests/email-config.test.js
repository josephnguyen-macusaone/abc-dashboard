#!/usr/bin/env node

/**
 * Email Configuration Validator
 * Validates email service configuration settings without sending emails
 *
 * Usage:
 *   npm run test:email:config
 */

import '../src/infrastructure/config/env.js'; // Load environment first
import { config } from '../src/infrastructure/config/config.js';

/**
 * Display current email configuration
 */
function displayCurrentConfig() {
  console.log('🔍 Testing Email Service Configuration...\n');

  console.log('📋 Current Email Configuration:');
  console.log(`   Service: ${config.EMAIL_SERVICE}`);
  console.log(`   Host: ${config.EMAIL_HOST}`);
  console.log(`   Port: ${config.EMAIL_PORT}`);
  console.log(`   Secure: ${config.EMAIL_SECURE}`);
  console.log(`   From: ${config.EMAIL_FROM}`);
  console.log(`   From Name: ${config.EMAIL_FROM_NAME}`);
  console.log(`   User: ${config.EMAIL_USER ? 'Set (masked)' : 'Not set'}`);
  console.log(`   Pass: ${config.EMAIL_PASS ? 'Set (masked)' : 'Not set'}\n`);

  // Show current service status
  console.log('🔍 Service Status:');
  switch (config.EMAIL_SERVICE) {
    case 'mailhog':
      console.log('   ✅ Using MailHog (Development)');
      console.log(`   🌐 Web UI: http://localhost:8025`);
      console.log(`   📧 SMTP: ${config.EMAIL_HOST}:${config.EMAIL_PORT}`);
      break;
    case 'google-workspace':
      console.log('   ✅ Using Google Workspace (Production)');
      console.log(`   📧 Account: ${config.EMAIL_USER || 'Not configured'}`);
      console.log(`   🌐 SMTP: ${config.EMAIL_HOST}:${config.EMAIL_PORT}`);
      break;
    default:
      console.log(`   ⚠️  Unknown service: ${config.EMAIL_SERVICE || 'Not set'}`);
  }
  console.log();
}

/**
 * Validate Google Workspace configuration
 */
function validateGoogleWorkspaceConfig(issues) {
  console.log('🔧 Validating Google Workspace Configuration...\n');

  if (!config.EMAIL_USER) {
    issues.push('❌ EMAIL_USER is required for Google Workspace');
  } else {
    console.log('✅ EMAIL_USER is configured');

    // Check if it's a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.EMAIL_USER)) {
      issues.push('❌ EMAIL_USER must be a valid email address');
    } else {
      console.log('✅ EMAIL_USER is a valid email address');
    }
  }

  if (!config.EMAIL_PASS) {
    issues.push('❌ EMAIL_PASS (App Password) is required for Google Workspace');
  } else {
    console.log('✅ EMAIL_PASS is configured');

    // Check App Password format (16 characters, no spaces)
    if (config.EMAIL_PASS.length !== 16 || config.EMAIL_PASS.includes(' ')) {
      issues.push('⚠️  EMAIL_PASS should be a 16-character App Password without spaces');
    } else {
      console.log('✅ EMAIL_PASS appears to be a valid App Password format');
    }
  }

  validateEmailFrom(issues);
  validateGoogleWorkspaceSMTP(issues);
}

/**
 * Validate EMAIL_FROM setting
 */
function validateEmailFrom(issues) {
  if (!config.EMAIL_FROM) {
    issues.push('❌ EMAIL_FROM is required for email service');
  } else {
    console.log('✅ EMAIL_FROM is configured');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.EMAIL_FROM)) {
      issues.push('❌ EMAIL_FROM must be a valid email address');
    } else {
      console.log('✅ EMAIL_FROM is a valid email address');
    }
  }
}

/**
 * Validate Google Workspace SMTP settings
 */
function validateGoogleWorkspaceSMTP(issues) {
  // Check SMTP settings
  if (config.EMAIL_HOST !== 'smtp.gmail.com') {
    issues.push('⚠️  EMAIL_HOST should be smtp.gmail.com for Google Workspace');
  } else {
    console.log('✅ EMAIL_HOST is correct for Google Workspace');
  }

  if (config.EMAIL_PORT !== 587) {
    issues.push('⚠️  EMAIL_PORT should be 587 for Google Workspace (TLS)');
  } else {
    console.log('✅ EMAIL_PORT is correct for Google Workspace');
  }

  if (config.EMAIL_SECURE !== false) {
    issues.push('⚠️  EMAIL_SECURE should be false for Google Workspace (uses STARTTLS)');
  } else {
    console.log('✅ EMAIL_SECURE is correct for Google Workspace');
  }
}

/**
 * Validate MailHog configuration
 */
function validateMailHogConfig(issues) {
  console.log('🔧 Validating MailHog Configuration...\n');

  // Check SMTP settings
  if (config.EMAIL_HOST !== 'localhost' && config.EMAIL_HOST !== 'mailhog') {
    issues.push('⚠️  EMAIL_HOST should be localhost or mailhog for MailHog');
  } else {
    console.log('✅ EMAIL_HOST is correct for MailHog');
  }

  if (config.EMAIL_PORT !== 1025) {
    issues.push('⚠️  EMAIL_PORT should be 1025 for MailHog SMTP');
  } else {
    console.log('✅ EMAIL_PORT is correct for MailHog');
  }

  if (config.EMAIL_SECURE !== false) {
    issues.push('⚠️  EMAIL_SECURE should be false for MailHog');
  } else {
    console.log('✅ EMAIL_SECURE is correct for MailHog');
  }

  // MailHog typically doesn't require authentication
  if (config.EMAIL_USER || config.EMAIL_PASS) {
    console.log("ℹ️  EMAIL_USER/EMAIL_PASS set (MailHog usually doesn't need auth)");
  } else {
    console.log('✅ No authentication configured (correct for MailHog)');
  }

  validateEmailFrom(issues);
}

/**
 * Validate email configuration based on service type
 */
function validateConfiguration() {
  const issues = [];

  switch (config.EMAIL_SERVICE) {
    case 'google-workspace':
      validateGoogleWorkspaceConfig(issues);
      break;
    case 'mailhog':
      validateMailHogConfig(issues);
      break;
    default:
      console.log(`⚠️  Unknown EMAIL_SERVICE: ${config.EMAIL_SERVICE}`);
      issues.push(`❌ Invalid EMAIL_SERVICE: ${config.EMAIL_SERVICE}`);
      issues.push('   Valid options: mailhog, google-workspace');
      break;
  }

  return issues;
}

/**
 * Report validation results
 */
function reportResults(issues) {
  if (issues.length === 0) {
    console.log('\n🎉 Configuration validation passed!');
    displayServiceSpecificSuccess();
  } else {
    console.log('\n❌ Configuration issues found:');
    issues.forEach((issue) => console.log(`   ${issue}`));
    console.log('\n🔧 Fix these issues and run this test again.');
  }
}

/**
 * Display service-specific success messages
 */
function displayServiceSpecificSuccess() {
  switch (config.EMAIL_SERVICE) {
    case 'google-workspace':
      console.log('✅ Your Google Workspace SMTP setup looks good.');
      console.log('\n💡 Next steps:');
      console.log('   1. Make sure 2FA is enabled on your Google Workspace account');
      console.log('   2. Generate an App Password at: https://myaccount.google.com/apppasswords');
      console.log('   3. Test email sending with a real email');
      break;
    case 'mailhog':
      console.log('✅ Your MailHog setup looks good.');
      console.log('\n💡 Next steps:');
      console.log('   1. Start MailHog: mailhog');
      console.log('   2. Check emails at: http://localhost:8025');
      console.log('   3. Test email sending with npm run test:email:send');
      break;
    default:
      console.log('✅ Your email configuration looks good.');
      break;
  }
}

/**
 * Display environment setup instructions
 */
function displaySetupInstructions() {
  console.log('\n📚 Environment Setup Instructions:');

  // Google Workspace setup
  displayGoogleWorkspaceSetup();

  // Development setup
  displayDevelopmentSetup();
}

/**
 * Display Google Workspace setup instructions
 */
function displayGoogleWorkspaceSetup() {
  console.log('\n📧 For Google Workspace:');
  console.log(`EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=abcd-efgh-ijkl-mnop  # Your 16-character App Password
EMAIL_SERVICE=google-workspace

Google Workspace Setup Steps:
1. Enable 2FA on your Google Workspace account
2. Generate App Password at: https://myaccount.google.com/apppasswords
3. Copy the 16-character password above
`);
}

/**
 * Display development setup instructions
 */
function displayDevelopmentSetup() {
  console.log('\n🔧 For Development (MailHog):');
  console.log(`EMAIL_SERVICE=mailhog
EMAIL_FROM=noreply@localhost
EMAIL_FROM_NAME=ABC Dashboard
EMAIL_HOST=localhost
EMAIL_PORT=1025

Note: Start MailHog with 'mailhog' command for development testing.`);
}

/**
 * Main execution function
 */
function main() {
  displayCurrentConfig();

  const issues = validateConfiguration();

  reportResults(issues);

  displaySetupInstructions();
}

// Run the test
main();
