import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { config } from '../../infrastructure/config/config.js';
import logger from '../../infrastructure/config/logger.js';
import { withServiceRetry, withTimeout } from '../utils/retry.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import { executeWithDegradation } from '../utils/graceful-degradation.js';
import {
  ExternalServiceUnavailableException,
  NetworkTimeoutException,
  ValidationException,
} from '../../domain/exceptions/domain.exception.js';

/**
 * Email Service
 * Handles sending emails using nodemailer with retry logic and error handling
 */
export class EmailService {
  constructor(correlationId = null) {
    this.correlationId = correlationId;
    this.transporter = this.createTransporter();
    this.isHealthy = true;
    this.lastHealthCheck = null;
    this.operationId = correlationId ? `${correlationId}_email` : null;
  }

  /**
   * Create nodemailer transporter with error handling
   */
  createTransporter() {
    try {
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
        // Add connection timeout
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000, // 5 seconds
        socketTimeout: 30000, // 30 seconds
      };

      const transporter = nodemailer.createTransport(transporterConfig);

      // Add error event listeners
      transporter.on('error', (error) => {
        logger.error('Email transporter error', {
          correlationId: this.correlationId,
          error: error.message,
          code: error.code,
        });
        this.isHealthy = false;
      });

      return transporter;
    } catch (error) {
      logger.error('Failed to create email transporter', {
        correlationId: this.correlationId,
        error: error.message,
      });
      throw new ExternalServiceUnavailableException('Email service configuration');
    }
  }

  /**
   * Send email verification with graceful degradation
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

    return executeWithDegradation(
      'email_service',
      () => this.sendEmail(to, subject, template, data),
      (error) => this.handleEmailDegradation('email_verification', { to, subject, data }, error),
      { operation: 'sendEmailVerification', to, correlationId: this.correlationId }
    );
  }

  /**
   * Send welcome email with temporary password and role-based content
   * @param {string} to - Recipient email
   * @param {Object} data - Template data including role and manager info
   */
  async sendWelcomeWithPassword(to, data) {
    const subject = 'Welcome to ABC Dashboard - Your Account Details';
    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ABC Dashboard!</h2>
        <p>Hello {{displayName}},</p>

        <p>An account has been created for you with the role of <strong>{{role}}</strong>.</p>

        <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p><strong>Email:</strong> {{username}}</p>
          <p><strong>Temporary Password:</strong> <span style="font-family: monospace; background-color: #e9ecef; padding: 2px 6px; border-radius: 3px;">{{password}}</span></p>
          <p><strong>Role:</strong> {{role}}</p>
          {{#if managerName}}
          <p><strong>Manager:</strong> {{managerName}}</p>
          {{/if}}
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <strong>⚠️ Security Notice:</strong> This is a temporary password. You will be required to change it on your first login.
        </div>

        <p style="margin: 30px 0;">
          <a href="{{loginUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to Your Account</a>
        </p>

        <h3>Getting Started:</h3>
        <ol>
          <li>Click the login button above</li>
          <li>Use your email and temporary password to log in</li>
          <li>You will be prompted to change your password immediately</li>
          <li>Choose a strong, memorable password</li>
        </ol>

        {{#if managerName}}
        <h3>Your Manager:</h3>
        <p>You are managed by: <strong>{{managerName}}</strong></p>
        <p>Contact your manager for any account-related questions.</p>
        {{/if}}

        <p>If you have any questions, please contact your administrator.</p>
        <p>Welcome to the team!</p>
        <p>Best regards,<br />ABC Dashboard Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This email was sent because an administrator created an account for you.
          If you believe this was done in error, please contact support immediately.
        </p>
      </div>
    `;

    return executeWithDegradation(
      'email_service',
      () => this.sendEmail(to, subject, template, data),
      (error) => this.handleEmailDegradation('welcome_email', { to, subject, data }, error),
      { operation: 'sendWelcomeWithPassword', to, correlationId: this.correlationId }
    );
  }

  /**
   * Send generic email with retry logic and error handling
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} template - Handlebars template
   * @param {Object} data - Template data
   * @param {Object} options - Additional options
   */
  async sendEmail(to, subject, template, data = {}, options = {}) {
    const { priority = 'normal', correlationId = this.correlationId } = options;

    // Validate inputs
    if (!to || !subject || !template) {
      throw new ValidationException('Missing required email parameters: to, subject, template');
    }

    if (!this._isValidEmail(to)) {
      throw new ValidationException('Invalid recipient email address');
    }

    try {
      // Compile template
      const compiledTemplate = handlebars.compile(template);
      const html = compiledTemplate(data);

      const mailOptions = {
        from: `"${config.EMAIL_FROM_NAME}" <${config.EMAIL_FROM}>`,
        to,
        subject,
        html,
        priority, // high, normal, low
        headers: correlationId ? { 'X-Correlation-ID': correlationId } : undefined,
      };

      // Send with circuit breaker, retry logic, and timeout
      const result = await withCircuitBreaker(
        'email-service',
        () =>
          withTimeout(
            () =>
              withServiceRetry(
                async () => {
                  try {
                    const sendResult = await this.transporter.sendMail(mailOptions);
                    this.isHealthy = true; // Mark as healthy on success
                    return sendResult;
                  } catch (sendError) {
                    // Map nodemailer errors to domain exceptions
                    throw this._mapEmailError(sendError);
                  }
                },
                {
                  correlationId,
                  onRetry: (error, attempt, delay) => {
                    logger.warn(`Email send retry attempt ${attempt + 1}`, {
                      correlationId,
                      to,
                      subject,
                      error: error.message,
                      delay,
                    });
                  },
                }
              ),
            45000, // 45 second timeout
            'Email sending'
          ),
        {
          correlationId,
          failureThreshold: 3, // Open circuit after 3 failures
          recoveryTimeout: 30000, // Try to close after 30 seconds
          monitoringPeriod: 60000, // Monitor failures over 1 minute
        },
        {
          to,
          subject,
          template: `${template.substring(0, 50)}...`, // Log template preview
        }
      );

      logger.info('Email sent successfully', {
        correlationId,
        to,
        subject,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error('Email sending failed after retries', {
        correlationId,
        to,
        subject,
        error: error.message,
        errorType: error.constructor.name,
      });

      // Re-throw domain exceptions as-is
      if (
        error instanceof ExternalServiceUnavailableException ||
        error instanceof NetworkTimeoutException ||
        error instanceof ValidationException
      ) {
        throw error;
      }

      // Wrap unexpected errors
      throw new ExternalServiceUnavailableException('Email delivery service');
    }
  }

  /**
   * Verify email configuration with retry logic
   */
  async verifyConnection() {
    try {
      const result = await withTimeout(
        () =>
          withServiceRetry(
            async () => {
              try {
                await this.transporter.verify();
                this.isHealthy = true;
                this.lastHealthCheck = new Date();
                return true;
              } catch (verifyError) {
                this.isHealthy = false;
                throw this._mapEmailError(verifyError);
              }
            },
            {
              correlationId: this.correlationId,
              maxRetries: 2, // Fewer retries for health checks
            }
          ),
        10000, // 10 second timeout
        'Email connection verification'
      );

      logger.info('Email service connection verified', {
        correlationId: this.correlationId,
        healthy: this.isHealthy,
      });

      return result;
    } catch (error) {
      logger.error('Email service connection verification failed', {
        correlationId: this.correlationId,
        error: error.message,
      });

      if (
        error instanceof ExternalServiceUnavailableException ||
        error instanceof NetworkTimeoutException
      ) {
        throw error;
      }

      throw new ExternalServiceUnavailableException('Email service');
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      service: 'email',
      healthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      correlationId: this.correlationId,
    };
  }

  /**
   * Handle email service degradation
   * @private
   */
  handleEmailDegradation(emailType, emailData, error) {
    logger.warn(`Email service degraded for ${emailType}, logging for later retry`, {
      correlationId: this.correlationId,
      emailType,
      recipient: emailData.to,
      subject: emailData.subject,
      error: error.message,
    });

    // In a production system, you would store this in a database table
    // for later processing when the email service recovers
    return {
      sent: false,
      degraded: true,
      queuedForRetry: true,
      emailType,
      recipient: emailData.to,
      subject: emailData.subject,
      correlationId: this.correlationId,
      queuedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate email address format
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Map nodemailer errors to domain exceptions
   * @private
   */
  _mapEmailError(error) {
    const errorMessage = error.message?.toLowerCase() || '';

    // Connection errors
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      errorMessage.includes('connection') ||
      errorMessage.includes('connect')
    ) {
      return new ExternalServiceUnavailableException('Email SMTP server');
    }

    // Timeout errors
    if (
      error.code === 'ETIMEDOUT' ||
      error.code === 'ESOCKETTIMEDOUT' ||
      errorMessage.includes('timeout')
    ) {
      return new NetworkTimeoutException('Email sending');
    }

    // Authentication errors
    if (
      error.code === 'EAUTH' ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('credentials')
    ) {
      return new ExternalServiceUnavailableException('Email authentication');
    }

    // Rate limiting
    if (error.code === 'EMESSAGE' && errorMessage.includes('rate limit')) {
      return new ExternalServiceUnavailableException('Email rate limiting');
    }

    // Invalid recipient
    if (
      error.code === 'EENVELOPE' ||
      errorMessage.includes('invalid recipient') ||
      errorMessage.includes('mailbox')
    ) {
      return new ValidationException('Invalid email recipient');
    }

    // Generic service unavailable
    if (error.code === 'ESOCKET' || error.responseCode >= 500) {
      return new ExternalServiceUnavailableException('Email delivery service');
    }

    // Return original error wrapped in service exception
    return new ExternalServiceUnavailableException('Email service');
  }
}
