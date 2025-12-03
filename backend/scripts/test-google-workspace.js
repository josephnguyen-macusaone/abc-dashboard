#!/usr/bin/env node

/**
 * Google Workspace Domain Setup Test Script
 *
 * This script performs comprehensive tests for Google Workspace domain setup:
 * - DNS record verification
 * - SMTP connection test
 * - Email sending test
 * - Domain authentication checks
 *
 * Usage:
 *   node scripts/test-google-workspace.js [test-email@yourdomain.com]
 */

import '../src/infrastructure/config/env.js';
import { config } from '../src/infrastructure/config/config.js';
import { EmailService } from '../src/shared/services/email-service.js';

async function testDNSRecords() {
  console.log('🔍 Testing DNS Records...\n');

  const domain = config.EMAIL_FROM.split('@')[1];
  console.log(`Domain: ${domain}\n`);

  // Test MX records
  try {
    const { execSync } = await import('child_process');
    const mxOutput = execSync(`dig MX ${domain} +short`, { encoding: 'utf8' });
    console.log('📧 MX Records:');
    console.log(mxOutput || 'No MX records found');

    // Check if Google Workspace MX records are present
    if (mxOutput.includes('google.com') || mxOutput.includes('gmail.com')) {
      console.log('✅ Google Workspace MX records detected\n');
    } else {
      console.log('⚠️  Google Workspace MX records not found\n');
    }
  } catch (error) {
    console.log('❌ Could not check MX records (dig command not available)\n');
  }

  // Test SPF record
  try {
    const { execSync } = await import('child_process');
    const spfOutput = execSync(`dig TXT ${domain} +short`, { encoding: 'utf8' });
    console.log('🛡️  SPF Record:');
    console.log(spfOutput || 'No SPF record found');

    if (spfOutput.includes('v=spf1') && spfOutput.includes('include:_spf.google.com')) {
      console.log('✅ Valid SPF record for Google Workspace\n');
    } else {
      console.log('⚠️  SPF record may not be properly configured\n');
    }
  } catch (error) {
    console.log('❌ Could not check SPF record\n');
  }
}

async function testEmailConfiguration() {
  console.log('📧 Testing Email Configuration...\n');

  console.log('Current Configuration:');
  console.log(`  Service: ${config.EMAIL_SERVICE}`);
  console.log(`  Host: ${config.EMAIL_HOST}`);
  console.log(`  Port: ${config.EMAIL_PORT}`);
  console.log(`  Secure: ${config.EMAIL_SECURE}`);
  console.log(`  From: ${config.EMAIL_FROM}`);
  console.log(`  User: ${config.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
  console.log(`  Pass: ${config.EMAIL_PASS ? '✅ Set' : '❌ Not set'}\n`);

  // Validate Google Workspace configuration
  if (config.EMAIL_SERVICE !== 'google-workspace') {
    console.log('⚠️  EMAIL_SERVICE is not set to "google-workspace"');
    console.log('   Current value:', config.EMAIL_SERVICE);
    console.log('   Please set EMAIL_SERVICE=google-workspace in your .env file\n');
    return false;
  }

  if (config.EMAIL_HOST !== 'smtp.gmail.com') {
    console.log('⚠️  EMAIL_HOST should be "smtp.gmail.com" for Google Workspace');
    console.log('   Current value:', config.EMAIL_HOST, '\n');
    return false;
  }

  if (config.EMAIL_PORT !== 587) {
    console.log('⚠️  EMAIL_PORT should be 587 for Google Workspace');
    console.log('   Current value:', config.EMAIL_PORT, '\n');
    return false;
  }

  if (config.EMAIL_SECURE !== false) {
    console.log('⚠️  EMAIL_SECURE should be false for Google Workspace (uses STARTTLS)');
    console.log('   Current value:', config.EMAIL_SECURE, '\n');
    return false;
  }

  console.log('✅ Basic configuration looks good\n');
  return true;
}

async function testEmailSending(recipient) {
  console.log('📤 Testing Email Sending...\n');

  try {
    const emailService = new EmailService('google-workspace-test');

    const testEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🔧 Google Workspace Domain Test</h2>
        <p>This email confirms your Google Workspace domain setup is working!</p>

        <div style="background-color: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4caf50;">
          <h3>✅ Success!</h3>
          <p><strong>Domain:</strong> ${config.EMAIL_FROM.split('@')[1]}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Service:</strong> Google Workspace SMTP</p>
        </div>

        <p>Your ABC Dashboard can now send emails from your domain.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This test email was sent by the Google Workspace setup verification script.
        </p>
      </div>
    `;

    const result = await emailService.sendEmail(
      recipient,
      'ABC Dashboard - Google Workspace Domain Test',
      testEmail
    );

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   To: ${recipient}`);
    console.log(`   From: ${config.EMAIL_FROM}`);

    return true;
  } catch (error) {
    console.error('❌ Email sending failed!');
    console.error(`Error: ${error.message}\n`);

    // Provide specific troubleshooting for Google Workspace
    console.log('🔧 Google Workspace Troubleshooting:');
    console.log('1. Verify 2FA is enabled on your Google Workspace account');
    console.log('2. Confirm EMAIL_PASS is a 16-character App Password (not regular password)');
    console.log('3. Check that your domain is verified in Google Workspace Admin Console');
    console.log('4. Ensure MX records are properly configured');
    console.log('5. Verify SPF record includes "_spf.google.com"');
    console.log('6. Check Gmail sending limits: https://support.google.com/mail/answer/22839');

    return false;
  }
}

async function main() {
  console.log('🚀 Google Workspace Domain Setup Test\n');
  console.log('=' * 50, '\n');

  const recipient = process.argv[2] || 'test@yourdomain.com';

  if (recipient === 'test@yourdomain.com') {
    console.log('⚠️  Using default test email. Provide your actual domain email as argument:');
    console.log(`   node scripts/test-google-workspace.js your-email@yourdomain.com\n`);
  }

  // Test DNS records
  await testDNSRecords();

  // Test configuration
  const configValid = await testEmailConfiguration();

  if (!configValid) {
    console.log('❌ Configuration issues found. Please fix before testing email sending.');
    process.exit(1);
  }

  // Test email sending
  const emailSent = await testEmailSending(recipient);

  if (emailSent) {
    console.log('\n🎉 Google Workspace domain setup test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Check your email inbox for the test message');
    console.log('2. Verify the email came from your domain');
    console.log('3. Test with actual application features');
    console.log('4. Monitor email delivery in Google Workspace Admin Console');
  } else {
    console.log('\n❌ Google Workspace setup test failed.');
    console.log('Please review the troubleshooting steps above.');
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

