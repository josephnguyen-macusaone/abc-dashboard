/**
 * Create License Use Case
 * Handles license creation with business rules and audit logging
 */
import { LicenseResponseDto } from '../../dto/license/index.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class CreateLicenseUseCase {
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute create license use case
   * @param {Object} licenseData - License creation data
   * @param {Object} context - Request context (userId, ipAddress, userAgent)
   * @returns {Promise<LicenseResponseDto>} Created license
   */
  async execute(licenseData, context = {}) {
    const { userId, ipAddress, userAgent } = context;

    try {
      // Check if license key already exists
      const existingLicense = await this.licenseRepository.findByKey(licenseData.key);
      if (existingLicense) {
        throw new ValidationException('License key already exists');
      }

      // Add audit fields - only set if userId is a valid non-empty string
      // This prevents FK violations when userId is undefined, null, or doesn't exist in users table
      const dataWithAudit = {
        ...licenseData,
        seatsUsed: 0, // New licenses start with 0 seats used
      };

      // Only add createdBy/updatedBy if userId is a valid string
      // Repository will handle the actual FK validation
      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        dataWithAudit.createdBy = userId;
        dataWithAudit.updatedBy = userId;
      }

      // Create license
      const license = await this.licenseRepository.save(dataWithAudit);

      // Create audit event only if we have a valid userId
      // Skip audit logging for system/bulk operations without user context
      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        await this.licenseRepository.createAuditEvent({
          type: 'license.created',
          actorId: userId,
          entityId: license.id,
          entityType: 'license',
          metadata: {
            license_key: license.key,
            product: license.product,
            plan: license.plan,
          },
          ipAddress,
          userAgent,
        });
      }

      return LicenseResponseDto.fromEntity(license);
    } catch (error) {
      throw new Error(`Failed to create license: ${error.message}`);
    }
  }
}
