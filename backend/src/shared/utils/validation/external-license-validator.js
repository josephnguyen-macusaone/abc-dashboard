import { licenseSyncConfig } from '../../../infrastructure/config/license-sync-config.js';
import logger from '../../../infrastructure/config/logger.js';

/**
 * External License Data Validator
 * Validates and sanitizes data received from external license API
 */
export class ExternalLicenseValidator {
  constructor() {
    this.validationSchema = {
      type: 'object',
      required: ['countid'],
      properties: {
        // Core identifiers
        countid: {
          type: 'number',
          minimum: 1,
          description: 'Unique count identifier',
        },
        appid: {
          type: ['string', 'null'],
          minLength: 1,
          maxLength: licenseSyncConfig.validation.maxFieldLength,
          description: 'Application identifier (optional)',
        },

        // Contact information
        dba: {
          type: ['string', 'null'],
          minLength: 1,
          maxLength: licenseSyncConfig.validation.maxFieldLength,
          description: 'Doing Business As name',
        },
        zip: {
          type: ['string', 'null'],
          pattern: '^\\d{5}(-\\d{4})?$',
          description: 'ZIP code in 12345 or 12345-6789 format',
        },
        emailLicense: {
          type: ['string', 'null'],
          format: 'email',
          maxLength: licenseSyncConfig.validation.maxFieldLength,
          description: 'License email address',
        },

        // License details
        license_type: {
          type: 'string',
          enum: licenseSyncConfig.validation.allowedLicenseTypes,
          description: 'License type (demo or product)',
        },
        status: {
          type: 'number',
          enum: [0, 1],
          description: 'License status (0=inactive, 1=active)',
        },

        // Financial data
        monthlyFee: {
          type: ['number', 'null'],
          minimum: 0,
          description: 'Monthly fee amount',
        },
        smsBalance: {
          type: ['number', 'null'],
          minimum: 0,
          description: 'SMS balance count',
        },
        smsPurchased: {
          type: ['number', 'null'],
          minimum: 0,
          description: 'SMS purchased count',
        },

        // Dates
        activateDate: {
          type: ['string', 'null'],
          format: 'date',
          description: 'License activation date',
        },
        comingExpired: {
          type: ['string', 'null'],
          format: 'date',
          description: 'License expiration date',
        },
        lastActive: {
          type: ['string', 'null'],
          format: 'date-time',
          description: 'Last activity timestamp',
        },

        // Additional metadata
        mid: {
          type: ['string', 'null'],
          maxLength: licenseSyncConfig.validation.maxFieldLength,
          description: 'Merchant ID',
        },
        note: {
          type: ['string', 'null'],
          maxLength: licenseSyncConfig.validation.maxFieldLength * 2, // Allow longer notes
          description: 'License notes',
        },
        sendbatWorkspace: {
          type: ['string', 'null'],
          maxLength: licenseSyncConfig.validation.maxFieldLength,
          description: 'Sendbat workspace identifier',
        },

        // Package data (flexible structure)
        package: {
          type: ['object', 'array', 'null'],
          description: 'Package configuration data',
        },
      },
    };
  }

  /**
   * Validate single license data
   * @param {Object} licenseData - License data to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  /**
   * Normalize API response keys to schema format (external API uses mixed casing)
   */
  _normalizeApiKeys(licenseData) {
    return {
      ...licenseData,
      emailLicense: licenseData.emailLicense ?? licenseData.Email_license,
      activateDate: licenseData.activateDate ?? licenseData.ActivateDate,
      comingExpired: licenseData.comingExpired ?? licenseData.Coming_expired,
      sendbatWorkspace: licenseData.sendbatWorkspace ?? licenseData.Sendbat_workspace,
      note: licenseData.note ?? licenseData.Note,
      smsBalance: licenseData.smsBalance ?? licenseData.sms_balance ?? licenseData.SmsBalance,
    };
  }

  validateLicense(licenseData, options = {}) {
    const { strictMode = licenseSyncConfig.validation.strictMode } = options;
    const errors = [];
    const warnings = [];

    try {
      // Basic structure validation
      if (!licenseData || typeof licenseData !== 'object') {
        errors.push('License data must be a valid object');
        return { isValid: false, errors, warnings, sanitizedData: null };
      }

      const normalized = this._normalizeApiKeys(licenseData);

      // Required field validation
      if (!normalized.countid || typeof normalized.countid !== 'number') {
        errors.push('countid is required and must be a number');
      }

      // Field-by-field validation
      const sanitizedData = this._sanitizeAndValidateFields(
        normalized,
        errors,
        warnings,
        strictMode
      );

      // Business rule validation
      this._validateBusinessRules(sanitizedData, errors, warnings);

      const isValid = errors.length === 0;

      if (!isValid) {
        logger.warn('License data validation failed', {
          countid: licenseData.countid,
          appid: licenseData.appid,
          errors: errors.slice(0, 5), // Limit error logging
          errorCount: errors.length,
        });
      }

      return {
        isValid,
        errors,
        warnings,
        sanitizedData: isValid ? sanitizedData : null,
      };
    } catch (error) {
      logger.error('License validation error', {
        countid: licenseData?.countid,
        error: error.message,
      });
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings,
        sanitizedData: null,
      };
    }
  }

  /**
   * Validate array of license data
   * @param {Array} licensesData - Array of license data
   * @param {Object} options - Validation options
   * @returns {Object} Bulk validation result
   */
  validateLicenses(licensesData, options = {}) {
    const { continueOnError = true } = options;
    const results = {
      total: licensesData.length,
      valid: 0,
      invalid: 0,
      errors: [],
      warnings: [],
      validLicenses: [],
      invalidLicenses: [],
    };

    logger.info('Starting bulk license validation', {
      totalLicenses: licensesData.length,
      continueOnError,
    });

    for (let i = 0; i < licensesData.length; i++) {
      const licenseData = licensesData[i];

      try {
        const validation = this.validateLicense(licenseData, options);

        if (validation.isValid) {
          results.valid++;
          results.validLicenses.push(validation.sanitizedData);
        } else {
          results.invalid++;
          results.invalidLicenses.push({
            index: i,
            data: licenseData,
            errors: validation.errors,
          });
          results.errors.push(...validation.errors.map((err) => `License ${i}: ${err}`));
        }

        results.warnings.push(...validation.warnings.map((warn) => `License ${i}: ${warn}`));

        // Stop on first error if not continuing
        if (!validation.isValid && !continueOnError) {
          break;
        }
      } catch (error) {
        results.invalid++;
        const errorMsg = `License ${i} validation failed: ${error.message}`;
        results.errors.push(errorMsg);
        results.invalidLicenses.push({
          index: i,
          data: licenseData,
          errors: [error.message],
        });

        if (!continueOnError) {
          break;
        }
      }
    }

    logger.info('Bulk license validation completed', {
      total: results.total,
      valid: results.valid,
      invalid: results.invalid,
      successRate: results.total > 0 ? Math.round((results.valid / results.total) * 100) : 0,
    });

    return results;
  }

  /**
   * Sanitize and validate individual fields
   * @private
   */
  _sanitizeAndValidateFields(licenseData, errors, warnings, strictMode) {
    const sanitized = { ...licenseData };

    // Sanitize and validate each field
    Object.keys(this.validationSchema.properties).forEach((fieldName) => {
      const fieldSchema = this.validationSchema.properties[fieldName];
      const value = licenseData[fieldName];

      try {
        const sanitizedValue = this._sanitizeField(fieldName, value, fieldSchema);
        if (sanitizedValue !== undefined) {
          sanitized[fieldName] = sanitizedValue;
        }
      } catch (error) {
        if (strictMode) {
          errors.push(`${fieldName}: ${error.message}`);
        } else {
          warnings.push(`${fieldName}: ${error.message} (using original value)`);
        }
      }
    });

    return sanitized;
  }

  /**
   * Sanitize individual field based on schema
   * @private
   */
  _sanitizeField(fieldName, value, schema) {
    // Handle null/undefined values for optional fields
    if (value === null || value === undefined) {
      if (schema.type.includes('null')) {
        return null;
      }
      return undefined;
    }

    // Type validation and conversion
    switch (schema.type) {
      case 'string':
      case ['string', 'null']:
        if (typeof value !== 'string') {
          throw new Error(`must be a string, got ${typeof value}`);
        }
        if (schema.maxLength && value.length > schema.maxLength) {
          throw new Error(`exceeds maximum length of ${schema.maxLength} characters`);
        }
        if (schema.minLength && value.length < schema.minLength) {
          throw new Error(`must be at least ${schema.minLength} characters long`);
        }
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          throw new Error(`does not match required pattern`);
        }
        if (schema.format === 'email' && !this._isValidEmail(value)) {
          throw new Error(`must be a valid email address`);
        }
        return value.trim();

      case 'number':
      case ['number', 'null']: {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) {
          throw new Error(`must be a valid number, got "${value}"`);
        }
        if (schema.minimum !== undefined && numValue < schema.minimum) {
          throw new Error(`must be at least ${schema.minimum}`);
        }
        return numValue;
      }

      case 'object':
      case 'array':
      case ['object', 'array', 'null']:
        // For complex types, just validate they exist and are the right type
        if (schema.type === 'object' && typeof value !== 'object') {
          throw new Error(`must be an object`);
        }
        if (schema.type === 'array' && !Array.isArray(value)) {
          throw new Error(`must be an array`);
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Validate business rules across fields
   * @private
   */
  _validateBusinessRules(sanitizedData, errors, warnings) {
    // Business rule: If license is active (status=1), it should have valid dates
    if (sanitizedData.status === 1) {
      if (!sanitizedData.activateDate) {
        warnings.push('Active license should have an activation date');
      }
      if (!sanitizedData.lastActive) {
        warnings.push('Active license should have a last active timestamp');
      }
    }

    // Business rule: SMS balance should not exceed purchased amount
    if (sanitizedData.smsBalance && sanitizedData.smsPurchased) {
      if (sanitizedData.smsBalance > sanitizedData.smsPurchased) {
        warnings.push('SMS balance should not exceed purchased amount');
      }
    }

    // Business rule: Expiration date should be after activation date
    if (sanitizedData.activateDate && sanitizedData.comingExpired) {
      const activateDate = new Date(sanitizedData.activateDate);
      const expireDate = new Date(sanitizedData.comingExpired);

      if (expireDate <= activateDate) {
        errors.push('Expiration date must be after activation date');
      }
    }
  }

  /**
   * Simple email validation
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const externalLicenseValidator = new ExternalLicenseValidator();
