import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { config } from '../../infrastructure/config/config.js';

/**
 * Email Service
 * Handles sending emails using nodemailer
 */
export class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  /**
   * Create nodemailer transporter
   */
  createTransporter() {
    const transporterConfig = {
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: config.EMAIL_SECURE,
      auth: config.EMAIL_USER && config.EMAIL_PASS ? {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
      } : undefined
    };

    return nodemailer.createTransport(transporterConfig);
  }

  /**
   * Send email verification
   * @param {string} to - Recipient email
   * @param {Object} data - Template data
   */
  async sendEmailVerification(to, data) {
    const subject = 'Verify Your Email Address';
    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Our App!</h2>
        <p>Hello {{firstName}},</p>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <p style="margin: 30px 0;">
          <a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
        </p>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p>{{verificationUrl}}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `;

    await this.sendEmail(to, subject, template, data);
  }

  /**
   * Send generic email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} template - Handlebars template
   * @param {Object} data - Template data
   */
  async sendEmail(to, subject, template, data = {}) {
    try {
      // Compile template
      const compiledTemplate = handlebars.compile(template);
      const html = compiledTemplate(data);

      const mailOptions = {
        from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      throw new Error(`Email configuration error: ${error.message}`);
    }
  }
}
