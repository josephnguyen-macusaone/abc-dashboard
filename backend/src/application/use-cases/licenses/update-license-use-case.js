/**
 * Update License Use Case
 * Handles license updates with business rules and audit logging
 */
import { LicenseResponseDto } from '../../dto/license/index.js';
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class UpdateLicenseUseCase {
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute update license use case
   * @param {string} licenseId - License ID to update
   * @param {Object} updates - Update data
   * @param {Object} context - Request context (userId, ipAddress, userAgent)
   * @returns {Promise<LicenseResponseDto>} Updated license
   */
  async execute(licenseId, updates, context = {}) {
    const { userId, ipAddress, userAgent } = context;

    try {
      // Get existing license
      const existingLicense = await this.licenseRepository.findById(licenseId);
      if (!existingLicense) {
        throw new ValidationException('License not found');
      }

      // Check if key is being changed and if new key already exists
      if (updates.key && updates.key !== existingLicense.key) {
        const keyExists = await this.licenseRepository.keyExists(updates.key, licenseId);
        if (keyExists) {
          throw new ValidationException('License key already exists');
        }
      }

      // Add audit fields
      const dataWithAudit = {
        ...updates,
        updatedBy: userId,
      };

      // Update license
      const updatedLicense = await this.licenseRepository.update(licenseId, dataWithAudit);

      // Create audit event for significant changes
      const significantChanges = ['status', 'seatsTotal', 'expiresAt', 'plan'];
      const hasSignificantChange = significantChanges.some((field) => updates[field] !== undefined);

      if (hasSignificantChange) {
        await this.licenseRepository.createAuditEvent({
          type: 'license.updated',
          actorId: userId,
          entityId: licenseId,
          entityType: 'license',
          metadata: {
            license_key: updatedLicense.key,
            changes: Object.keys(updates),
            previousStatus: existingLicense.status,
            newStatus: updates.status,
          },
          ipAddress,
          userAgent,
        });
      }

      return LicenseResponseDto.fromEntity(updatedLicense);
    } catch (error) {
      throw new Error(`Failed to update license: ${error.message}`);
    }
  }
}
