import nodemailer from 'nodemailer';
import { config } from './config.js';
import logger from './logger.js';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // MailHog configuration for development
  if (config.EMAIL_SERVICE === 'mailhog') {
    return nodemailer.createTransporter({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: false, // MailHog doesn't use TLS
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });
  }

  // Gmail configuration
  if (config.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
    });
  }

  // Generic SMTP configuration
  const transporterConfig = {
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_SECURE,
    auth: config.EMAIL_USER && config.EMAIL_PASS ? {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS,
    } : undefined,
  };

  return nodemailer.createTransporter(transporterConfig);
};

const transporter = createTransporter();

// Verify connection configuration
const verifyConnection = async () => {
  try {
    await transporter.verify();
    logger.info('Email service connected successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed:', error);
    return false;
  }
};

// Send email function
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `${config.EMAIL_FROM_NAME || 'Your App'} <${config.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text, // Fallback for email clients that don't support HTML
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${options.email}: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error(`Failed to send email to ${options.email}:`, error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Email templates
const emailTemplates = {
  // Email verification template
  emailVerification: (data) => ({
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Your App!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationUrl}"
              style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${data.verificationUrl}</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666;">If you didn't create an account, please ignore this email.</p>
      </div>
    `,
    text: `
      Welcome to Your App!

      Thank you for registering. Please verify your email address by visiting: ${data.verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account, please ignore this email.
    `
  }),

  // Welcome email after verification
  welcome: (data) => ({
    subject: 'Welcome to Your App!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome, ${data.name}!</h2>
        <p>Your email address has been successfully verified. You can now access all features of your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl}"
              style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Get Started
          </a>
        </div>
        <p>Thank you for joining us!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">If you have any questions, feel free to contact our support team.</p>
      </div>
    `,
    text: `
      Welcome, ${data.name}!

      Your email address has been successfully verified. You can now access all features of your account.

      Get started: ${data.loginUrl}

      Thank you for joining us!

      If you have any questions, feel free to contact our support team.
    `
  })
};

// Helper function to send templated emails
const sendTemplatedEmail = async (template, email, data) => {
  const templateConfig = emailTemplates[template];
  if (!templateConfig) {
    throw new Error(`Email template '${template}' not found`);
  }

  const emailContent = templateConfig(data);
  return await sendEmail({
    email,
    ...emailContent
  });
};

export default {
  sendEmail,
  sendTemplatedEmail,
  verifyConnection,
  emailTemplates
};
