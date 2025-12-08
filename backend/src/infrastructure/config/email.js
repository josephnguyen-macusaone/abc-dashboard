import nodemailer from 'nodemailer';
import { config } from './config.js';
import logger from './logger.js';
import { emailTemplates, renderEmailTemplate } from '../email/templates.js';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  const service = config.EMAIL_SERVICE;
  const resolvedHost =
    config.EMAIL_HOST ||
    (service === 'mailhog'
      ? 'localhost'
      : service === 'sendgrid'
        ? 'smtp.sendgrid.net'
        : service === 'mailjet'
          ? 'in-v3.mailjet.com'
          : 'smtp.gmail.com');
  const resolvedPort =
    config.EMAIL_PORT ||
    (service === 'mailhog'
      ? 1025
      : service === 'sendgrid' || service === 'google-workspace' || service === 'mailjet'
        ? 587
        : 587);

  // MailHog configuration for development
  if (config.EMAIL_SERVICE === 'mailhog') {
    logger.info('Using MailHog for email service');
    return nodemailer.createTransport({
      host: resolvedHost,
      port: resolvedPort,
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

    return nodemailer.createTransport({
      host: resolvedHost,
      port: resolvedPort,
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

  // Mailjet SMTP configuration
  if (config.EMAIL_SERVICE === 'mailjet') {
    logger.info('Using Mailjet SMTP for email service');

    // Validate required Mailjet configuration
    if (!config.EMAIL_USER || !config.EMAIL_PASS) {
      logger.error('Mailjet requires EMAIL_USER (API Key) and EMAIL_PASS (Secret Key)');
      throw new Error('Missing Mailjet SMTP credentials');
    }

    return nodemailer.createTransport({
      host: resolvedHost,
      port: resolvedPort,
      secure: config.EMAIL_SECURE === 'true' || config.EMAIL_SECURE === true, // Use SSL for port 465
      auth: {
        user: config.EMAIL_USER, // Mailjet API Key
        pass: config.EMAIL_PASS, // Mailjet Secret Key
      },
      tls: {
        rejectUnauthorized: false,
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

    return nodemailer.createTransport({
      host: resolvedHost,
      port: resolvedPort,
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
    return nodemailer.createTransport({
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
    host: resolvedHost,
    port: resolvedPort,
    secure: config.EMAIL_SECURE,
    auth:
      config.EMAIL_USER && config.EMAIL_PASS
        ? {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASS,
          }
        : undefined,
  };

  return nodemailer.createTransport(transporterConfig);
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

// Helper function to send templated emails
const sendTemplatedEmail = async (template, email, data) => {
  const emailContent = renderEmailTemplate(template, data);
  return await sendEmail({
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
