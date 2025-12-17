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

      // Add audit fields
      const dataWithAudit = {
        ...licenseData,
        createdBy: userId,
        updatedBy: userId,
        seatsUsed: 0, // New licenses start with 0 seats used
      };

      // Create license
      const license = await this.licenseRepository.save(dataWithAudit);

      // Create audit event
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

      return LicenseResponseDto.fromEntity(license);
    } catch (error) {
      throw new Error(`Failed to create license: ${error.message}`);
    }
  }
}
