import nodemailer from 'nodemailer';

// Load env vars
import '../src/infrastructure/config/env.js';
import { config } from '../src/infrastructure/config/config.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: config.EMAIL_PASS,
  },
});

console.log('Testing SendGrid SMTP connection...');
console.log('API Key:', config.EMAIL_PASS ? `${config.EMAIL_PASS.substring(0, 15)}...` : 'NOT SET');
console.log('From:', config.EMAIL_FROM);

try {
  console.log('\n1. Verifying SMTP connection...');
  await transporter.verify();
  console.log('✅ SMTP connection verified!');

  console.log('\n2. Sending test email...');
  const result = await transporter.sendMail({
    from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
    to: 'test@fgm.194.mytemp.website',
    subject: 'SendGrid SMTP Test',
    text: 'This is a test email from SendGrid SMTP.',
    html: '<p>This is a <strong>test email</strong> from SendGrid SMTP.</p>',
  });

  console.log('✅ Email sent successfully!');
  console.log('Message ID:', result.messageId);
} catch (error) {
  console.error('\n❌ Error occurred:');
  console.error('Message:', error.message);
  console.error('Code:', error.code);
  console.error('Response Code:', error.responseCode);
  console.error('Response:', error.response);
  console.error('\nFull error:', JSON.stringify(error, null, 2));
}
