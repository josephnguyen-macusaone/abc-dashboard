import { config } from './config.js';
import logger from './logger.js';
import { createEmailTransporter } from '../email/transporter.js';
import { emailTemplates, renderEmailTemplate } from '../email/templates.js';

const transporter = createEmailTransporter(config);

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
