import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { config } from '../../infrastructure/config/config.js';
import logger from '../../infrastructure/config/logger.js';
import { withServiceRetry, withTimeout } from '../utils/reliability/retry.js';
import { withCircuitBreaker } from '../utils/reliability/circuit-breaker.js';
import { executeWithDegradation } from '../utils/reliability/graceful-degradation.js';
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
  constructor() {
    this.correlationId = null;
    this.transporter = this.createTransporter();
    this.isHealthy = true;
    this.lastHealthCheck = null;
    this.operationId = null;
  }

  /**
   * Create nodemailer transporter with error handling
   */
  createTransporter() {
    try {
      let transporterConfig;

      // Google Workspace SMTP configuration
      if (config.EMAIL_SERVICE === 'google-workspace') {
        logger.info('Initializing Google Workspace SMTP transporter', {
          correlationId: this.correlationId,
          host: config.EMAIL_HOST,
          port: config.EMAIL_PORT,
        });

        transporterConfig = {
          host: config.EMAIL_HOST,
          port: config.EMAIL_PORT,
          secure: false, // Use TLS (STARTTLS) for Google Workspace
          auth: {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASS, // App Password
          },
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false, // Allow during development
          },
          // Connection pooling for better performance
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          // Connection timeouts
          connectionTimeout: 30000, // 30 seconds for Google Workspace
          greetingTimeout: 10000, // 10 seconds
          socketTimeout: 60000, // 60 seconds
        };
      } else if (config.EMAIL_SERVICE === 'mailjet') {
        logger.info('Initializing Mailjet SMTP transporter', {
          correlationId: this.correlationId,
          host: config.EMAIL_HOST || 'in-v3.mailjet.com',
          port: config.EMAIL_PORT || 587,
        });

        if (!config.EMAIL_USER || !config.EMAIL_PASS) {
          throw new ValidationException(
            'Mailjet requires EMAIL_USER (API Key) and EMAIL_PASS (Secret Key)'
          );
        }

        transporterConfig = {
          host: config.EMAIL_HOST || 'in-v3.mailjet.com',
          port: config.EMAIL_PORT || 587,
          secure: config.EMAIL_SECURE === true || config.EMAIL_SECURE === 'true',
          auth: {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASS,
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
        };
      } else {
        // Standard SMTP configuration (MailHog, generic SMTP)
        transporterConfig = {
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
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      // Add error event listeners
      transporter.on('error', (error) => {
        logger.error('Email transporter error', {
          correlationId: this.correlationId,
          service: config.EMAIL_SERVICE,
          error: error.message,
          code: error.code,
        });
        this.isHealthy = false;
      });

      return transporter;
    } catch (error) {
      logger.error('Failed to create email transporter', {
        correlationId: this.correlationId,
        service: config.EMAIL_SERVICE,
        error: error.message,
      });
      throw new ExternalServiceUnavailableException('Email service configuration');
    }
  }

  // Email verification disabled (admin-managed accounts)
  async sendEmailVerification() {
    throw new Error('Email verification is disabled for admin-managed accounts');
  }

  /**
   * Send welcome email with temporary password and role-based content
   * @param {string} to - Recipient email
   * @param {Object} data - Template data including role and manager info
   */
  async sendWelcomeWithPassword(to, data) {
    const subject = 'Welcome to ABC Dashboard - Your Account Details';
    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ABC Dashboard</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FF885C 0%, #F88800 50%, #CC4700 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">ABC Salon</h1>
                    <p style="margin: 8px 0 0 0; font-size: 16px; color: #ffffff; opacity: 0.9;">Welcome Aboard!</p>
                  </td>
                </tr>

          <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #262627; text-align: center;">Welcome to ABC Dashboard</h2>
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6; text-align: center;">
              Hi {{displayName}}, your account has been created with the role: <strong>{{role}}</strong>
                    </p>

            <!-- Account Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding-bottom: 12px;"><strong>Email:</strong> {{{email}}}</td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px;"><strong>Temporary Password:</strong>
                                <span style="background-color: #E5E7EB; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace;">{{password}}</span>
                              </td>
                            </tr>
              {{#if managerName}}
                            <tr>
                              <td><strong>Manager:</strong> {{managerName}}</td>
                            </tr>
              {{/if}}
                          </table>
                        </td>
                      </tr>
                    </table>

            <!-- Security Notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #FFF8E1; border: 1px solid #FFE082; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                          <p style="margin: 0; font-size: 14px; color: #F57C00;">
                            ⚠️ <strong>Important:</strong> This is a temporary password. You must change it on first login.
                          </p>
                        </td>
                      </tr>
                    </table>

            <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="{{{loginUrl}}}" style="display: inline-block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Login to ABC Dashboard
              </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Steps -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #F8FAFC; padding: 20px; border-radius: 8px;">
                          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #262627;">Quick Start:</h3>
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">1. Click "Login to ABC Dashboard" above</p>
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">2. Use your email and temporary password</p>
                          <p style="margin: 0; font-size: 14px; color: #374151;">3. Change your password when prompted</p>
                        </td>
                      </tr>
                    </table>

            {{#if managerName}}
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td style="background-color: #EFF6FF; border: 1px solid #BFDBFE; padding: 16px; border-radius: 8px;">
                          <p style="margin: 0; font-size: 14px; color: #1E40AF;">
                            👔 <strong>Manager:</strong> {{managerName}} - Contact them for support.
                          </p>
                        </td>
                      </tr>
                    </table>
            {{/if}}
                  </td>
                </tr>

          <!-- Footer -->
                <tr>
                  <td style="background-color: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                    <p style="margin: 0; font-size: 14px; color: #64748B;">© 2025 ABC Salon. All rights reserved.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
              await this.transporter.verify();
              this.isHealthy = true;
              this.lastHealthCheck = new Date();

              // Additional service-specific validation
              if (config.EMAIL_SERVICE === 'google-workspace') {
                await this._validateGoogleWorkspaceConfig();
              }

              return true;
            },
            {
              correlationId: this.correlationId,
              maxRetries: 2, // Fewer retries for health checks
            }
          ),
        config.EMAIL_SERVICE === 'google-workspace' ? 30000 : 10000, // Longer timeout for Google Workspace
        'Email connection verification'
      );

      logger.info('Email service connection verified', {
        correlationId: this.correlationId,
        service: config.EMAIL_SERVICE,
        healthy: this.isHealthy,
      });

      return result;
    } catch (error) {
      logger.error('Email service connection verification failed', {
        correlationId: this.correlationId,
        service: config.EMAIL_SERVICE,
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
   * Validate Google Workspace configuration
   * @private
   */
  async _validateGoogleWorkspaceConfig() {
    const issues = [];

    // Check required environment variables
    if (!config.EMAIL_USER) {
      issues.push('EMAIL_USER is required for Google Workspace');
    }

    if (!config.EMAIL_PASS) {
      issues.push('EMAIL_PASS (App Password) is required for Google Workspace');
    }

    if (!config.EMAIL_FROM) {
      issues.push('EMAIL_FROM is required for Google Workspace');
    }

    // Validate email format
    if (config.EMAIL_USER && !this._isValidEmail(config.EMAIL_USER)) {
      issues.push('EMAIL_USER must be a valid email address');
    }

    if (config.EMAIL_FROM && !this._isValidEmail(config.EMAIL_FROM)) {
      issues.push('EMAIL_FROM must be a valid email address');
    }

    // Check if it's a Google Workspace domain
    if (
      config.EMAIL_USER &&
      !config.EMAIL_USER.includes('@gmail.com') &&
      !config.EMAIL_USER.includes('@googlemail.com')
    ) {
      logger.warn('Using custom domain - ensure Google Workspace is properly configured', {
        correlationId: this.correlationId,
        email: config.EMAIL_USER.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
      });
    }

    if (issues.length > 0) {
      const errorMessage = `Google Workspace configuration issues: ${issues.join(', ')}`;
      logger.error(errorMessage, { correlationId: this.correlationId });
      throw new ValidationException(errorMessage);
    }

    logger.info('Google Workspace configuration validated', {
      correlationId: this.correlationId,
      user: config.EMAIL_USER.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
    });
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
    const errorCode = error.code || error.responseCode;

    // Google Workspace specific errors
    if (config.EMAIL_SERVICE === 'google-workspace') {
      // App Password issues
      if (errorCode === 535 || errorMessage.includes('authentication failed')) {
        logger.error('Google Workspace authentication failed - check App Password', {
          correlationId: this.correlationId,
          error: errorMessage,
        });
        return new ExternalServiceUnavailableException(
          'Google Workspace authentication failed. Verify App Password is correct.'
        );
      }

      // Daily sending limit exceeded
      if (errorCode === 550 && errorMessage.includes('quota')) {
        logger.warn('Google Workspace daily sending limit exceeded', {
          correlationId: this.correlationId,
          error: errorMessage,
        });
        return new ExternalServiceUnavailableException(
          'Google Workspace daily sending limit exceeded'
        );
      }

      // Account disabled or suspended
      if (
        errorCode === 550 &&
        (errorMessage.includes('disabled') || errorMessage.includes('suspended'))
      ) {
        logger.error('Google Workspace account issue', {
          correlationId: this.correlationId,
          error: errorMessage,
        });
        return new ExternalServiceUnavailableException(
          'Google Workspace account disabled or suspended'
        );
      }

      // TLS/SSL issues
      if (errorMessage.includes('tls') || errorMessage.includes('ssl')) {
        logger.warn('Google Workspace TLS/SSL connection issue', {
          correlationId: this.correlationId,
          error: errorMessage,
        });
        return new ExternalServiceUnavailableException('Google Workspace TLS connection failed');
      }
    }

    // Connection errors
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      errorMessage.includes('connection') ||
      errorMessage.includes('connect') ||
      errorMessage.includes('network')
    ) {
      return new ExternalServiceUnavailableException('Email SMTP server connection failed');
    }

    // Timeout errors
    if (
      error.code === 'ETIMEDOUT' ||
      error.code === 'ESOCKETTIMEDOUT' ||
      errorMessage.includes('timeout')
    ) {
      return new NetworkTimeoutException('Email sending timeout');
    }

    // Authentication errors (generic)
    if (
      error.code === 'EAUTH' ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('credentials') ||
      errorMessage.includes('login')
    ) {
      return new ExternalServiceUnavailableException('Email authentication failed');
    }

    // Rate limiting
    if (
      error.code === 'EMESSAGE' &&
      (errorMessage.includes('rate limit') || errorMessage.includes('quota'))
    ) {
      return new ExternalServiceUnavailableException('Email rate limiting exceeded');
    }

    // Invalid recipient
    if (
      error.code === 'EENVELOPE' ||
      errorMessage.includes('invalid recipient') ||
      errorMessage.includes('mailbox') ||
      errorMessage.includes('user unknown')
    ) {
      return new ValidationException('Invalid email recipient address');
    }

    // Server errors
    if (error.code === 'ESOCKET' || (error.responseCode && error.responseCode >= 500)) {
      return new ExternalServiceUnavailableException(
        'Email delivery service temporarily unavailable'
      );
    }

    // Return original error wrapped in service exception
    logger.warn('Unhandled email error', {
      correlationId: this.correlationId,
      service: config.EMAIL_SERVICE,
      error: error.message,
      code: error.code,
      responseCode: error.responseCode,
    });

    return new ExternalServiceUnavailableException('Email service error');
  }

  /**
   * Send password reset with generated password email with graceful degradation
   * @param {string} to - Recipient email
   * @param {Object} data - Template data including displayName, temporaryPassword, and loginUrl
   */
  async sendPasswordResetWithGeneratedPassword(to, data) {
    const subject = 'Your Temporary Password - ABC Dashboard';
    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Temporary Password - ABC Dashboard</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Archivo:wght@400;500;600;700&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #FAFAFA;
            color: #262627;
            line-height: 1.6;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .header {
            background: linear-gradient(135deg, #FF885C 0%, #F88800 50%, #CC4700 100%);
            padding: 40px 30px;
            text-align: center;
          }

          .logo {
            font-family: 'Archivo', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #FFFFFF;
            text-decoration: none;
            display: inline-block;
            margin-bottom: 8px;
          }

          .header-text {
            color: #FFFFFF;
            font-size: 18px;
            font-weight: 500;
            opacity: 0.9;
          }

          .content {
            padding: 40px 30px;
          }

          .main-title {
            font-size: 24px;
            font-weight: 700;
            color: #262627;
            margin-bottom: 16px;
            text-align: center;
          }

          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #262627;
            margin-bottom: 12px;
          }

          .description {
            font-size: 16px;
            color: #525252;
            margin-bottom: 32px;
            line-height: 1.6;
          }

          .password-section {
            background: linear-gradient(135deg, #FFF3CD 0%, #FEF3C7 100%);
            border: 1px solid #FCD34D;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }

          .password-section h3 {
            font-size: 18px;
            font-weight: 600;
            color: #92400E;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .password-section h3:before {
            content: "🔑";
            margin-right: 8px;
          }

          .password-display {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 18px;
            font-weight: 600;
            color: #262627;
            background-color: #FFFFFF;
            border: 2px solid #FCD34D;
            padding: 12px 20px;
            border-radius: 8px;
            display: inline-block;
            letter-spacing: 1px;
            margin: 8px 0;
          }

          .security-notice {
            background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
            border: 1px solid #FCA5A5;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
          }

          .security-notice h4 {
            font-size: 16px;
            font-weight: 600;
            color: #DC2626;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
          }

          .security-notice h4:before {
            content: "⚠️";
            margin-right: 8px;
          }

          .security-notice p {
            font-size: 14px;
            color: #DC2626;
            margin: 0;
          }

          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
            color: #FFFFFF;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            box-shadow: 0 4px 14px 0 rgba(34, 197, 94, 0.39);
            transition: all 0.2s ease;
          }

          .cta-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px 0 rgba(34, 197, 94, 0.5);
          }

          .steps-section {
            background-color: #F8FAFC;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
          }

          .steps-section h3 {
            font-size: 18px;
            font-weight: 600;
            color: #262627;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
          }

          .steps-section h3:before {
            content: "🚀";
            margin-right: 8px;
          }

          .steps-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .step-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            font-size: 15px;
            color: #374151;
          }

          .step-number {
            background: linear-gradient(135deg, #0B80D8 0%, #075985 100%);
            color: #FFFFFF;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 12px;
            margin-right: 12px;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .footer {
            background-color: #F8FAFC;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #E2E8F0;
          }

          .footer-text {
            font-size: 14px;
            color: #64748B;
            margin-bottom: 8px;
          }

          .footer-brand {
            font-family: 'Archivo', sans-serif;
            font-weight: 600;
            color: #262627;
            font-size: 16px;
          }

          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }

            .header {
              padding: 30px 20px;
            }

            .logo {
              font-size: 24px;
            }

            .header-text {
              font-size: 16px;
            }

            .content {
              padding: 30px 20px;
            }

            .main-title {
              font-size: 20px;
            }

            .password-section {
              padding: 20px;
            }

            .password-display {
              font-size: 16px;
              padding: 10px 16px;
            }

            .cta-button {
              padding: 14px 24px;
              font-size: 15px;
              display: block;
              width: 100%;
            }

            .steps-section {
              padding: 20px;
            }

            .footer {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="logo">${this.getLogoSVG()}</div>
            <div class="header-text">Password Reset</div>
          </div>

          <!-- Main Content -->
          <div class="content">
            <div class="title">Your Temporary Password</div>
            <div class="subtitle">
              Hi {{displayName}}, we've generated a temporary password for your ABC Dashboard account.
            </div>

            <!-- Password Section -->
            <div class="password-section">
              <h3>Your Temporary Password</h3>
              <div class="password-display">{{temporaryPassword}}</div>
              <p style="font-size: 14px; color: #92400E; margin-top: 12px;">
                Copy this password and keep it safe. You'll need to change it after logging in.
              </p>
            </div>

            <!-- Security Notice -->
            <div class="security-notice">
              <h4>Important Security Information</h4>
              <p>This temporary password was generated specifically for your account. For your security, you must change this password immediately after your first login.</p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
              <a href="{{{loginUrl}}}" class="cta-button">
                Login to ABC Dashboard
              </a>
            </div>

            <!-- Quick Steps -->
            <div class="steps-section">
              <h3>What to do next:</h3>
              <ol class="steps-list">
                <li class="step-item">
                  <div class="step-number">1</div>
                  <div>Click "Login to ABC Dashboard" above or go to your login page</div>
                </li>
                <li class="step-item">
                  <div class="step-number">2</div>
                  <div>Use your email address and the temporary password shown above</div>
                </li>
                <li class="step-item">
                  <div class="step-number">3</div>
                  <div>You'll be prompted to change your password immediately</div>
                </li>
                <li class="step-item">
                  <div class="step-number">4</div>
                  <div>Choose a strong, memorable password for future logins</div>
                </li>
              </ol>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-text">ABC Dashboard Team</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return executeWithDegradation(
      'email_service',
      () => this.sendEmail(to, subject, template, data),
      (error) =>
        this.handleEmailDegradation(
          'password_reset_with_generated_password',
          { to, subject, data },
          error
        ),
      { operation: 'sendPasswordResetWithGeneratedPassword', to, correlationId: this.correlationId }
    );
  }

  /**
   * Send password reset confirmation email with graceful degradation
   * @param {string} to - Recipient email
   * @param {Object} data - Template data including displayName
   */
  async sendPasswordResetConfirmationEmail(to, data) {
    const subject = 'Password Reset Successful - ABC Dashboard';
    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful - ABC Dashboard</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Archivo:wght@400;500;600;700&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #FAFAFA;
            color: #262627;
            line-height: 1.6;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .header {
            background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
            padding: 40px 30px;
            text-align: center;
          }

          .logo {
            font-family: 'Archivo', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #FFFFFF;
            text-decoration: none;
            display: inline-block;
            margin-bottom: 8px;
          }

          .header-text {
            color: #FFFFFF;
            font-size: 18px;
            font-weight: 500;
            opacity: 0.9;
          }

          .content {
            padding: 40px 30px;
          }

          .main-title {
            font-size: 24px;
            font-weight: 700;
            color: #262627;
            margin-bottom: 16px;
            text-align: center;
          }

          .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #262627;
            margin-bottom: 12px;
          }

          .description {
            font-size: 16px;
            color: #525252;
            margin-bottom: 32px;
            line-height: 1.6;
          }

          .success-icon {
            text-align: center;
            margin: 24px 0;
          }

          .success-icon div {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: #FFFFFF;
            margin-bottom: 16px;
          }

          .success-message {
            background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
            border: 1px solid #BBF7D0;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }

          .success-message h3 {
            font-size: 20px;
            font-weight: 600;
            color: #166534;
            margin-bottom: 8px;
          }

          .success-message p {
            font-size: 16px;
            color: #166534;
            margin: 0;
          }

          .security-notice {
            background: linear-gradient(135deg, #FFF3CD 0%, #FEF3C7 100%);
            border: 1px solid #FCD34D;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
          }

          .security-notice h4 {
            font-size: 16px;
            font-weight: 600;
            color: #92400E;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
          }

          .security-notice h4:before {
            content: "🛡️";
            margin-right: 8px;
          }

          .security-notice p {
            font-size: 14px;
            color: #92400E;
            margin: 0;
          }

          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #0B80D8 0%, #075985 100%);
            color: #FFFFFF;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            box-shadow: 0 4px 14px 0 rgba(11, 128, 216, 0.39);
            transition: all 0.2s ease;
          }

          .cta-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px 0 rgba(11, 128, 216, 0.5);
          }

          .details-section {
            background-color: #F8FAFC;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
          }

          .details-section h3 {
            font-size: 18px;
            font-weight: 600;
            color: #262627;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
          }

          .details-section h3:before {
            content: "ℹ️";
            margin-right: 8px;
          }

          .details-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .detail-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            font-size: 15px;
            color: #374151;
          }

          .detail-icon {
            background: linear-gradient(135deg, #0B80D8 0%, #075985 100%);
            color: #FFFFFF;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 12px;
            margin-right: 12px;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .footer {
            background-color: #F8FAFC;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #E2E8F0;
          }

          .footer-text {
            font-size: 14px;
            color: #64748B;
            margin-bottom: 8px;
          }

          .footer-brand {
            font-family: 'Archivo', sans-serif;
            font-weight: 600;
            color: #262627;
            font-size: 16px;
          }

          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }

            .header {
              padding: 30px 20px;
            }

            .logo {
              font-size: 24px;
            }

            .header-text {
              font-size: 16px;
            }

            .content {
              padding: 30px 20px;
            }

            .main-title {
              font-size: 20px;
            }

            .success-message {
              padding: 20px;
            }

            .cta-button {
              padding: 14px 24px;
              font-size: 15px;
              display: block;
              width: 100%;
            }

            .details-section {
              padding: 20px;
            }

            .footer {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="logo">${this.getLogoSVG()}</div>
            <div class="header-text">Password Reset Complete</div>
          </div>

          <!-- Main Content -->
          <div class="content">
            <div class="title">Password Reset Complete</div>

            <div style="text-align: center; margin: 24px 0;">
              <div style="width: 60px; height: 60px; background-color: #22C55E; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; color: #FFFFFF;">✓</div>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <p style="font-size: 16px; color: #262627;">Hi {{displayName}}, your password has been successfully reset!</p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
              <a href="{{{loginUrl}}}" style="background-color: #0B80D8; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; margin: 20px 0;">
                Login to ABC Dashboard
              </a>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #FFF8E1; border: 1px solid #FFE082; padding: 14px; border-radius: 6px; margin: 20px 0;">
              <p style="color: #F57C00; margin: 0;">If you didn't request this password reset, please contact support immediately.</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-text">ABC Dashboard Team</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return executeWithDegradation(
      'email_service',
      () => this.sendEmail(to, subject, template, data),
      (error) =>
        this.handleEmailDegradation('password_reset_confirmation', { to, subject, data }, error),
      { operation: 'sendPasswordResetConfirmationEmail', to, correlationId: this.correlationId }
    );
  }

  /**
   * Send password reset email with graceful degradation
   * @param {string} to - Recipient email
   * @param {Object} data - Template data including resetUrl and displayName
   */
  async sendPasswordResetEmail(to, data) {
    const subject = 'Reset Your Password - ABC Dashboard';
    const template = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - ABC Dashboard</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
          <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FF885C 0%, #F88800 50%, #CC4700 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">ABC Salon</h1>
                    <p style="margin: 8px 0 0 0; font-size: 16px; color: #ffffff; opacity: 0.9;">Password Reset</p>
                  </td>
                </tr>

          <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #262627; text-align: center;">Reset Your Password</h2>
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #525252; line-height: 1.6; text-align: center;">
              Hi {{displayName}}, we received a request to reset your ABC Dashboard password.
                    </p>

            <!-- Security Notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #FFF8E1; border: 1px solid #FFE082; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                          <p style="margin: 0; font-size: 14px; color: #F57C00;">
                            ⏱️ This link expires in <strong>10 minutes</strong> for security.
                          </p>
                        </td>
                      </tr>
                    </table>

            <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="{{{resetUrl}}}" style="display: inline-block; background-color: #F66600; color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Steps -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="background-color: #F8FAFC; padding: 20px; border-radius: 8px;">
                          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #262627;">What to do:</h3>
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">1. Click the "Reset Password" button above</p>
                          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">2. Enter your new password (minimum 8 characters)</p>
                          <p style="margin: 0; font-size: 14px; color: #374151;">3. Confirm your new password</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Notice -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 24px;">
                      <tr>
                        <td style="background-color: #FEF2F2; border: 1px solid #FECACA; padding: 16px; border-radius: 8px;">
                          <p style="margin: 0; font-size: 13px; color: #991B1B;">
                            🔒 If you didn't request this password reset, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

          <!-- Footer -->
                <tr>
                  <td style="background-color: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">© 2025 ABC Salon. All rights reserved.</p>
                    <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                      This email was sent to {{{email}}}
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return executeWithDegradation(
      'email_service',
      () => this.sendEmail(to, subject, template, data),
      (error) => this.handleEmailDegradation('password_reset', { to, subject, data }, error),
      { operation: 'sendPasswordResetEmail', to, correlationId: this.correlationId }
    );
  }

  /**
   * Get ABC Dashboard SVG logo for email templates
   * @returns {string} SVG logo markup
   */
  getLogoSVG() {
    return `<svg width="120" height="50" viewBox="0 0 264 112" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M92.4048 65.2487H117.653L128.938 45.4756C128.938 45.4756 114.581 48.4926 95.6353 60.0961L92.4082 65.2521L92.4048 65.2487Z" fill="#231F20"/>
<path d="M143.358 42.7841L145.718 65.0725H171.088L166.498 42.7163C166.498 42.7163 148.206 41.4722 143.355 42.7807" fill="#231F20"/>
<path d="M80.8481 64.2894C130.018 30.1669 169.46 38.4619 169.46 38.4619C170.114 28.1024 175.056 22.1023 175.056 22.1023C123.035 22.5939 80.8481 64.2894 80.8481 64.2894Z" fill="url(#paint0_linear_418_2929)"/>
<path d="M110.992 36.8521C110.992 36.8521 136.609 20.9197 161.684 19.4959L158.389 3.07196H132.921C132.921 3.07196 110.748 36.8996 110.992 36.8521Z" fill="#231F20"/>
<path d="M13.685 3.05845H48.5635L48.2346 33.5436L62.723 2.99404H100.286L90.2556 51.8998C90.2556 51.8998 75.374 64.2898 74.4554 65.0119H61.0823L69.9333 23.4486L50.1364 65.0763H25.7496L26.8648 21.7435L17.163 64.9475H0.772949L13.6884 3.06184L13.685 3.05845Z" fill="#231F20"/>
<path d="M224.538 45.469L248.542 47.8284C248.542 47.8284 238.617 65.9608 207.803 65.1405C207.803 65.1405 192.528 65.0761 183.711 58.3573C173.636 50.6792 175.155 37.7401 175.253 36.2655C175.351 34.7909 177.283 21.9093 187.053 13.3194C193.026 8.37694 201.901 0.929371 220.881 0.0446126C220.881 0.0446126 250.579 -1.82321 254.413 18.6313H229.583C229.583 18.6313 222.65 13.716 214.782 15.7126C214.782 15.7126 205.803 17.255 201.358 31.7569C201.358 31.7569 195.311 49.8996 210.257 50.0962C210.257 50.0962 219.274 50.5335 224.532 45.469" fill="#231F20"/>
<path d="M17.2206 111.704C13.3324 111.704 10.1154 111.101 7.5696 109.897C5.0238 108.69 3.12208 106.982 1.8746 104.765C0.623737 102.548 0 99.9343 0 96.9207V80.1035H6.87128V96.6054C6.87128 99.5885 7.76621 101.894 9.56285 103.524C11.3561 105.151 13.9087 105.965 17.2274 105.965C20.5461 105.965 23.0952 105.151 24.8919 103.524C26.6851 101.897 27.5835 99.5919 27.5835 96.6054V80.1035H34.4547V96.9207C34.4547 99.9343 33.8276 102.548 32.5767 104.765C31.3259 106.982 29.4343 108.69 26.9021 109.897C24.3698 111.104 21.1461 111.704 17.2274 111.704H17.2206Z" fill="url(#paint1_linear_418_2929)"/>
<path d="M58.0888 111.704C55.7362 111.704 53.5362 111.562 51.4887 111.274C49.4378 110.989 47.6446 110.477 46.109 109.738C44.5733 108.999 43.3733 107.968 42.5157 106.64C41.6581 105.314 41.2275 103.609 41.2275 101.531V101.304C41.2275 101.212 41.2411 101.138 41.2716 101.077H48.0548C48.0242 101.199 48.0005 101.341 47.987 101.507C47.97 101.673 47.9632 101.863 47.9632 102.073C47.9632 103.009 48.37 103.768 49.1836 104.358C49.9971 104.945 51.1565 105.375 52.665 105.646C54.1735 105.918 55.9362 106.053 57.9532 106.053C58.8278 106.053 59.7092 106.016 60.5973 105.941C61.4854 105.867 62.3363 105.755 63.1533 105.602C63.9668 105.453 64.6991 105.24 65.3465 104.968C65.994 104.697 66.5059 104.358 66.8821 103.951C67.2584 103.545 67.4482 103.07 67.4482 102.528C67.4482 101.745 67.0923 101.117 66.3872 100.653C65.6787 100.185 64.7228 99.8022 63.516 99.5005C62.3092 99.1988 60.9532 98.9445 59.4481 98.731C57.9396 98.5208 56.3803 98.2869 54.7701 98.0293C53.1565 97.775 51.5972 97.4259 50.0921 96.9886C48.5836 96.5513 47.2276 95.9852 46.0242 95.2936C44.8174 94.6021 43.8615 93.7038 43.153 92.6021C42.4445 91.5037 42.092 90.1546 42.092 88.5546C42.092 87.1071 42.4377 85.8257 43.1326 84.7104C43.8242 83.5952 44.8513 82.6528 46.2073 81.8833C47.5632 81.1138 49.2277 80.5341 51.204 80.1443C53.1769 79.7544 55.4447 79.5578 58.0074 79.5578C60.5702 79.5578 62.8583 79.768 64.7906 80.1917C66.7194 80.6155 68.3161 81.2155 69.5839 81.9985C70.8483 82.7816 71.7907 83.724 72.411 84.8257C73.028 85.9274 73.3365 87.1545 73.3365 88.5105V89.2325H66.6448V88.6461C66.6448 87.9817 66.2821 87.3952 65.5601 86.8833C64.838 86.3715 63.8584 85.9647 62.6211 85.663C61.3838 85.3613 59.9837 85.2121 58.4176 85.2121C56.2481 85.2121 54.4854 85.3477 53.1294 85.6189C51.7734 85.8901 50.7768 86.2596 50.1463 86.7274C49.5124 87.1952 49.1971 87.7139 49.1971 88.2868C49.1971 88.9817 49.5497 89.5376 50.2582 89.958C50.9667 90.3817 51.9226 90.7207 53.1294 90.9749C54.3362 91.2326 55.6921 91.4665 57.1973 91.6766C58.7057 91.8868 60.2651 92.1275 61.8753 92.3987C63.4889 92.6699 65.0482 93.0156 66.5533 93.4394C68.0584 93.8631 69.4178 94.4258 70.6212 95.1343C71.828 95.8428 72.7839 96.7309 73.4924 97.8021C74.2009 98.8733 74.5534 100.192 74.5534 101.758C74.5534 104.168 73.8585 106.107 72.472 107.568C71.0856 109.029 69.1567 110.087 66.6855 110.735C64.2143 111.382 61.3499 111.707 58.0956 111.707L58.0888 111.704Z" fill="url(#paint2_linear_418_2929)"/>
<path d="M78.0723 111.162L93.625 80.1035H101.401L116.954 111.162H109.405L106.466 105.148H88.0656L85.1266 111.162H78.0723ZM90.7775 99.5885H103.754L100.137 91.9918C99.9844 91.6596 99.7675 91.1715 99.4827 90.524C99.1946 89.8765 98.9099 89.2121 98.6251 88.5341C98.337 87.8562 98.0827 87.2697 97.8556 86.7714C97.6285 86.2731 97.4997 86.0121 97.4725 85.9816H97.1098C96.8386 86.585 96.5302 87.2765 96.1844 88.063C95.8386 88.846 95.5064 89.5986 95.1912 90.324C94.8759 91.046 94.6115 91.6189 94.4013 92.0427L90.7843 99.5919L90.7775 99.5885Z" fill="url(#paint3_linear_418_2929)"/>
<path d="M155.518 111.704C151.389 111.704 147.833 111.08 144.85 109.826C141.866 108.575 139.568 106.751 137.955 104.355C136.341 101.958 135.534 99.0428 135.534 95.6055C135.534 92.1682 136.341 89.2596 137.955 86.88C139.565 84.5003 141.866 82.6833 144.85 81.4324C147.833 80.1816 151.389 79.5578 155.518 79.5578C159.646 79.5578 163.202 80.185 166.185 81.4324C169.169 82.6833 171.467 84.5003 173.08 86.88C174.694 89.2596 175.501 92.1682 175.501 95.6055C175.501 99.0428 174.694 101.958 173.08 104.355C171.467 106.751 169.169 108.575 166.185 109.826C163.202 111.077 159.646 111.704 155.518 111.704ZM155.518 105.962C157.385 105.962 159.104 105.751 160.67 105.328C162.236 104.907 163.602 104.287 164.762 103.473C165.921 102.66 166.826 101.636 167.474 100.399C168.121 99.1615 168.447 97.731 168.447 96.1038V95.0631C168.447 93.436 168.121 92.0122 167.474 90.7919C166.826 89.5715 165.921 88.5546 164.762 87.741C163.602 86.9274 162.236 86.3172 160.67 85.9105C159.104 85.5037 157.385 85.3003 155.518 85.3003C153.65 85.3003 151.931 85.5037 150.365 85.9105C148.799 86.3172 147.433 86.9274 146.273 87.741C145.114 88.5546 144.216 89.5715 143.585 90.7919C142.955 92.0122 142.636 93.436 142.636 95.0631V96.1038C142.636 97.731 142.951 99.1615 143.585 100.399C144.219 101.636 145.114 102.66 146.273 103.473C147.433 104.287 148.799 104.904 150.365 105.328C151.931 105.751 153.65 105.962 155.518 105.962Z" fill="url(#paint4_linear_418_2929)"/>
<path d="M182.914 111.162V80.1034H189.379L206.379 96.4257C206.769 96.7579 207.236 97.2088 207.779 97.7817C208.321 98.3545 208.887 98.941 209.474 99.5444C210.06 100.148 210.565 100.69 210.989 101.172H211.352C211.321 100.511 211.284 99.7037 211.24 98.7512C211.196 97.802 211.172 97.0257 211.172 96.4223V80.1H217.772V111.158H211.443L194.399 94.6562C193.585 93.8731 192.735 93.0053 191.843 92.0562C190.955 91.107 190.24 90.3443 189.697 89.7714H189.382C189.412 90.1646 189.443 90.8494 189.473 91.829C189.504 92.8087 189.518 93.9308 189.518 95.1986V111.158H182.917L182.914 111.162Z" fill="url(#paint5_linear_418_2929)"/>
<path d="M226.542 111.162V80.1035H257.963V85.846H233.413V92.4935H255.251V98.236H233.413V105.426H258.326V111.168H226.542V111.162Z" fill="url(#paint6_linear_418_2929)"/>
<path d="M240.99 22.9975L211.84 22.9365C211.84 22.9365 203.776 30.1366 205.938 40.1944C211.213 40.4825 218.667 41.1232 226.003 41.8215C236.868 39.8927 240.098 28.0823 240.99 23.0009V22.9975Z" fill="#BE1E2D"/>
<path style="mix-blend-mode:multiply" d="M240.99 22.9975L211.84 22.9365C211.84 22.9365 203.776 30.1366 205.938 40.1944C211.213 40.4825 218.667 41.1232 226.003 41.8215C236.868 39.8927 240.098 28.0823 240.99 23.0009V22.9975Z" fill="url(#paint7_linear_418_2929)"/>
<path d="M240.989 22.9976C240.094 28.079 236.867 39.8928 226.002 41.8182C233.653 42.547 241.169 43.3335 245.945 43.8454C249.071 44.181 252.108 42.6759 253.738 39.9877L264 23.0451L240.992 22.9942L240.989 22.9976Z" fill="#BE1E2D"/>
<defs>
<linearGradient id="paint0_linear_418_2929" x1="80.8481" y1="43.1942" x2="175.056" y2="43.1942" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A"/>
<stop offset="1" stop-color="#BE1E2D"/>
</linearGradient>
<linearGradient id="paint1_linear_418_2929" x1="-0.00338988" y1="95.6326" x2="258.326" y2="95.6326" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A"/>
<stop offset="1" stop-color="#BE1E2D"/>
</linearGradient>
<linearGradient id="paint2_linear_418_2929" x1="-0.00354019" y1="95.6326" x2="258.325" y2="95.6326" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A"/>
<stop offset="1" stop-color="#BE1E2D"/>
</linearGradient>
<linearGradient id="paint3_linear_418_2929" x1="-0.00342984" y1="95.6326" x2="258.326" y2="95.6326" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A"/>
<stop offset="1" stop-color="#BE1E2D"/>
</linearGradient>
<linearGradient id="paint4_linear_418_2929" x1="-0.00332166" y1="95.6326" x2="258.326" y2="95.6326" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A"/>
<stop offset="1" stop-color="#BE1E2D"/>
</linearGradient>
<linearGradient id="paint5_linear_418_2929" x1="-0.00382964" y1="95.6325" x2="258.325" y2="95.6325" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A"/>
<stop offset="1" stop-color="#BE1E2D"/>
</linearGradient>
<linearGradient id="paint6_linear_418_2929" x1="-0.00364896" y1="95.6326" x2="258.326" y2="95.6326" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A"/>
<stop offset="1" stop-color="#BE1E2D"/>
</linearGradient>
<linearGradient id="paint7_linear_418_2929" x1="211.416" y1="13.9669" x2="229.817" y2="40.8927" gradientUnits="userSpaceOnUse">
<stop stop-color="#F6914A" stop-opacity="0"/>
<stop offset="0.43" stop-color="#F6914A" stop-opacity="0"/>
<stop offset="1" stop-color="#751E2D"/>
</linearGradient>
</defs>
</svg>`;
  }

  /**
   * Set correlation ID for request tracking (used by DI container)
   * @param {string} correlationId - Request correlation ID
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    this.operationId = correlationId ? `${correlationId}_email` : null;
  }
}
