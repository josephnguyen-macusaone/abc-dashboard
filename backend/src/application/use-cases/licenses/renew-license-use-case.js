/**
 * Renew License Use Case
 * Handles license renewal operations with business logic validation
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';
import logger from '../../../infrastructure/config/logger.js';

export class RenewLicenseUseCase {
  constructor(licenseRepository, licenseLifecycleService) {
    this.licenseRepository = licenseRepository;
    this.licenseLifecycleService = licenseLifecycleService;
  }

  /**
   * Execute license renewal
   * @param {string} licenseId - License ID to renew
   * @param {Object} renewalOptions - Renewal configuration
   * @param {Object} context - Request context (userId, etc.)
   * @returns {Promise<Object>} Renewed license
   */
  async execute(licenseId, renewalOptions = {}, context = {}) {
    try {
      logger.info('Executing license renewal use case', {
        licenseId,
        renewalOptions,
        userId: context.userId,
      });

      // Validate input
      this.validateRenewalOptions(renewalOptions);

      // Find and validate license
      const license = await this.licenseRepository.findById(licenseId);
      if (!license) {
        throw new ValidationException('License not found');
      }

      // Validate renewal permissions and business rules
      await this.validateRenewalEligibility(license, context);

      // Perform the renewal using the lifecycle service
      const renewedLicense = await this.licenseLifecycleService.renewLicense(
        licenseId,
        renewalOptions,
        context
      );

      logger.info('License renewal completed successfully', {
        licenseId,
        licenseKey: license.key,
        oldExpiration: license.expiresAt,
        newExpiration: renewedLicense.expiresAt,
        userId: context.userId,
      });

      return renewedLicense;

    } catch (error) {
      logger.error('License renewal use case failed', {
        licenseId,
        renewalOptions,
        userId: context.userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Validate renewal options
   */
  validateRenewalOptions(options) {
    const errors = [];

    // Validate extension period if provided
    if (options.extensionDays !== undefined) {
      if (typeof options.extensionDays !== 'number' || options.extensionDays <= 0) {
        errors.push('Extension days must be a positive number');
      }
      if (options.extensionDays > 365 * 2) { // Max 2 years
        errors.push('Extension cannot exceed 2 years');
      }
    }

    // Validate new expiration date if provided
    if (options.newExpirationDate) {
      const newDate = new Date(options.newExpirationDate);
      const now = new Date();

      if (isNaN(newDate.getTime())) {
        errors.push('New expiration date must be a valid date');
      } else if (newDate <= now) {
        errors.push('New expiration date must be in the future');
      }
    }

    // Validate renewal reason
    if (options.reason && typeof options.reason !== 'string') {
      errors.push('Renewal reason must be a string');
    }

    if (errors.length > 0) {
      throw new ValidationException(`Invalid renewal options: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate if license can be renewed
   */
  async validateRenewalEligibility(license, context) {
    const errors = [];

    // Check if license exists and is not permanently revoked
    if (license.status === 'revoked') {
      errors.push('Cannot renew a permanently revoked license');
    }

    // Check user permissions (this would integrate with permission system)
    // For now, allow renewal if user has update permissions
    if (!context.userId) {
      errors.push('User authentication required for license renewal');
    }

    // Check if license is in a renewable state
    if (license.status === 'cancel' && !license.expiresAt) {
      errors.push('Cancelled licenses without expiration dates cannot be renewed');
    }

    // Business rule: Don't allow renewal if already renewed recently
    // Check renewal history for recent renewals (within last 24 hours)
    if (license.renewalHistory && license.renewalHistory.length > 0) {
      const recentRenewals = license.renewalHistory
        .filter(entry => entry.action === 'license_renewed')
        .filter(entry => {
          const renewalDate = new Date(entry.timestamp);
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return renewalDate > oneDayAgo;
        });

      if (recentRenewals.length > 0) {
        errors.push('License was recently renewed. Please wait before renewing again.');
      }
    }

    if (errors.length > 0) {
      throw new ValidationException(`License renewal not allowed: ${errors.join(', ')}`);
    }
  }

  /**
   * Calculate renewal pricing (placeholder for future implementation)
   */
  calculateRenewalPricing(license, renewalOptions) {
    // This would integrate with pricing service
    // For now, return basic pricing info

    const basePrice = this.getBasePrice(license);
    const termMultiplier = license.term === 'yearly' ? 12 : 1;

    return {
      basePrice,
      termMultiplier,
      totalPrice: basePrice * termMultiplier,
      currency: 'USD',
      prorated: false, // Could implement proration logic
    };
  }

  /**
   * Get base price for license type (placeholder)
   */
  getBasePrice(license) {
    // This would come from a pricing configuration
    const priceMap = {
      'Basic': 29.99,
      'Premium': 59.99,
      'Enterprise': 149.99,
    };

    return priceMap[license.plan] || 29.99;
  }

  /**
   * Get renewal preview without actually renewing
   */
  async getRenewalPreview(licenseId, renewalOptions = {}) {
    try {
      const license = await this.licenseRepository.findById(licenseId);
      if (!license) {
        throw new ValidationException('License not found');
      }

      // Calculate what the new expiration would be
      const currentExpiration = new Date(license.expiresAt || new Date());
      let newExpirationDate;

      if (renewalOptions.newExpirationDate) {
        newExpirationDate = new Date(renewalOptions.newExpirationDate);
      } else {
        const extensionDays = renewalOptions.extensionDays ||
          (license.term === 'yearly' ? 365 : 30);
        newExpirationDate = new Date(currentExpiration);
        newExpirationDate.setDate(currentExpiration.getDate() + extensionDays);
      }

      // Calculate pricing
      const pricing = this.calculateRenewalPricing(license, renewalOptions);

      return {
        licenseId,
        licenseKey: license.key,
        currentExpiration: license.expiresAt,
        newExpiration: newExpirationDate,
        extensionDays: Math.ceil((newExpirationDate - currentExpiration) / (1000 * 60 * 60 * 24)),
        pricing,
        plan: license.plan,
        term: license.term,
      };

    } catch (error) {
      logger.error('Failed to get renewal preview', {
        licenseId,
        error: error.message,
      });
      throw error;
    }
  }
}

export default RenewLicenseUseCase;