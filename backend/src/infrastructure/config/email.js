import nodemailer from 'nodemailer';
import { config } from './config.js';
import logger from './logger.js';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // MailHog configuration for development
  if (config.EMAIL_SERVICE === 'mailhog') {
    logger.info('Using MailHog for email service');
    return nodemailer.createTransporter({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: false, // MailHog doesn't use TLS
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });
  }

  // Google Workspace SMTP configuration
  if (config.EMAIL_SERVICE === 'google-workspace') {
    logger.info('Using Google Workspace SMTP for email service');

    // Validate required Google Workspace configuration
    if (!config.EMAIL_USER || !config.EMAIL_PASS) {
      logger.error('Google Workspace SMTP requires EMAIL_USER and EMAIL_PASS (App Password)');
      throw new Error('Missing Google Workspace SMTP credentials');
    }

    if (!config.EMAIL_FROM) {
      logger.error('Google Workspace SMTP requires EMAIL_FROM address');
      throw new Error('Missing EMAIL_FROM configuration for Google Workspace');
    }

    return nodemailer.createTransporter({
      host: config.EMAIL_HOST || 'smtp.gmail.com',
      port: config.EMAIL_PORT || 587,
      secure: false, // Use TLS (STARTTLS)
      auth: {
        user: config.EMAIL_USER, // Google Workspace email address
        pass: config.EMAIL_PASS, // App Password (not regular password)
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false, // Allow self-signed certificates during development
      },
      // Connection pooling for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  // SendGrid configuration
  if (config.EMAIL_SERVICE === 'sendgrid') {
    logger.info('Using SendGrid SMTP for email service');

    // Validate required SendGrid configuration
    if (!config.EMAIL_PASS || config.EMAIL_PASS === 'your-sendgrid-api-key-here') {
      logger.error('SendGrid requires EMAIL_PASS (API Key)');
      throw new Error('Missing SendGrid API Key - set EMAIL_PASS in your .env file');
    }

    return nodemailer.createTransporter({
      host: config.EMAIL_HOST || 'smtp.sendgrid.net',
      port: config.EMAIL_PORT || 587,
      secure: false, // Use TLS (STARTTLS)
      auth: {
        user: config.EMAIL_USER || 'apikey', // SendGrid uses 'apikey' as username
        pass: config.EMAIL_PASS, // SendGrid API Key as password
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false, // Allow self-signed certificates during development
      },
      // Connection pooling for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  // Gmail configuration (legacy support)
  if (config.EMAIL_SERVICE === 'gmail') {
    logger.warn('Using legacy Gmail configuration. Consider upgrading to Google Workspace SMTP');
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
    });
  }

  // Generic SMTP configuration (fallback)
  logger.info('Using generic SMTP configuration');
  const transporterConfig = {
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_SECURE,
    auth:
      config.EMAIL_USER && config.EMAIL_PASS
        ? {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASS,
          }
        : undefined,
  };

  return nodemailer.createTransporter(transporterConfig);
};

const transporter = createTransporter();

// Verify connection configuration
const verifyConnection = async () => {
  try {
    // Handle nodemailer (SMTP) verification
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
    // Handle nodemailer (SMTP) services
    const mailOptions = {
      from: `${config.EMAIL_FROM_NAME || 'ABC Dashboard'} <${config.EMAIL_FROM}>`,
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
    `,
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
    `,
  }),
};

// Helper function to send templated emails
const sendTemplatedEmail = async (template, email, data) => {
  const templateConfig = emailTemplates[template];
  if (!templateConfig) {
    throw new Error(`Email template '${template}' not found`);
  }

  const emailContent = templateConfig(data);
  return sendEmail({
    email,
    ...emailContent,
  });
};

export default {
  sendEmail,
  sendTemplatedEmail,
  verifyConnection,
  emailTemplates,
};
