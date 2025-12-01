#!/usr/bin/env node

/**
 * Email Testing Script
 *
 * This script tests the email configuration by sending a test email.
 * Run this script to verify your email setup is working correctly.
 *
 * Usage:
 *   node test-email.js [recipient@email.com]
 */

import { config } from './src/infrastructure/config/config.js';
import { EmailService } from './src/shared/services/email-service.js';

async function testEmail() {
  console.log('🚀 Testing Email Configuration...\n');

  // Display current configuration (safely)
  console.log('📧 Current Email Configuration:');
  console.log(`   Host: ${config.EMAIL_HOST}`);
  console.log(`   Port: ${config.EMAIL_PORT}`);
  console.log(`   Secure: ${config.EMAIL_SECURE}`);
  console.log(`   From: ${config.EMAIL_FROM_NAME} <${config.EMAIL_FROM}>`);
  console.log(`   Service: ${config.EMAIL_SERVICE || 'custom'}`);
  console.log(`   Auth: ${config.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}\n`);

  // Get recipient from command line or use default
  const recipient = process.argv[2] || 'test@example.com';

  try {
    console.log(`📤 Sending test email to: ${recipient}\n`);

    const emailService = new EmailService('email-test-script');

    // Test email content
    const testEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🧪 Email Configuration Test</h2>
        <p>Hello!</p>
        <p>This is a test email to verify your ABC Dashboard email configuration.</p>

        <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>✅ Configuration Working!</h3>
          <p><strong>Environment:</strong> ${config.NODE_ENV || 'development'}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Service:</strong> ${config.EMAIL_SERVICE || 'custom SMTP'}</p>
        </div>

        <p>If you received this email, your email configuration is working correctly!</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This test email was sent by the ABC Dashboard email testing script.
        </p>
      </div>
    `;

    const result = await emailService.sendEmail(recipient, 'ABC Dashboard - Email Test', testEmail);

    console.log('✅ Email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Recipient: ${recipient}`);
    console.log(`   Subject: ABC Dashboard - Email Test`);

    if (config.EMAIL_SERVICE === 'mailhog' || config.EMAIL_HOST === 'localhost') {
      console.log('\n📬 Check your MailHog interface: http://localhost:8025');
    } else {
      console.log('\n📬 Check your email inbox for the test message.');
    }

    console.log('\n🎉 Email configuration test completed successfully!');
  } catch (error) {
    console.error('❌ Email test failed!');
    console.error(`Error: ${error.message}`);

    // Provide troubleshooting advice
    console.log('\n🔧 Troubleshooting:');

    if (config.EMAIL_SERVICE === 'mailhog' || config.EMAIL_HOST === 'localhost') {
      console.log('1. Make sure MailHog is running: mailhog');
      console.log('2. Check MailHog web interface: http://localhost:8025');
      console.log('3. Verify EMAIL_HOST=localhost and EMAIL_PORT=1025 in your .env');
    } else if (config.EMAIL_SERVICE === 'gmail' || config.EMAIL_HOST === 'smtp.gmail.com') {
      console.log('1. Verify Gmail 2FA is enabled');
      console.log('2. Check that EMAIL_USER and EMAIL_PASS are set correctly');
      console.log('3. Ensure EMAIL_PASS is an App Password, not your regular password');
      console.log('4. Check Gmail sending limits: https://support.google.com/mail/answer/22839');
    } else {
      console.log('1. Verify SMTP server is running and accessible');
      console.log('2. Check EMAIL_HOST, EMAIL_PORT, and EMAIL_SECURE settings');
      console.log('3. Verify EMAIL_USER and EMAIL_PASS credentials');
      console.log('4. Check firewall settings for SMTP port access');
    }

    console.log('5. Review the Email Setup Guide: backend/docs/email-setup-guide.md');
    console.log('6. Check application logs for detailed error messages');

    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmail().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
