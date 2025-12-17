/**
 * Delete License Use Case
 * Handles license deletion with business rules and audit logging
 */
import { ValidationException } from '../../../domain/exceptions/domain.exception.js';

export class DeleteLicenseUseCase {
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute delete license use case
   * @param {string} licenseId - License ID to delete
   * @param {Object} context - Request context (userId, ipAddress, userAgent)
   * @returns {Promise<boolean>} Success status
   */
  async execute(licenseId, context = {}) {
    const { userId, ipAddress, userAgent } = context;

    try {
      // Get existing license
      const existingLicense = await this.licenseRepository.findById(licenseId);
      if (!existingLicense) {
        throw new ValidationException('License not found');
      }

      // Check if license has active assignments
      const activeAssignments = await this.licenseRepository.findAssignmentsByLicense(licenseId, {
        status: 'assigned',
      });

      if (activeAssignments.length > 0) {
        throw new ValidationException(
          `Cannot delete license with ${activeAssignments.length} active assignment(s). Please revoke assignments first.`
        );
      }

      // Create audit event before deletion
      await this.licenseRepository.createAuditEvent({
        type: 'license.deleted',
        actorId: userId,
        entityId: licenseId,
        entityType: 'license',
        metadata: {
          license_key: existingLicense.key,
          product: existingLicense.product,
          plan: existingLicense.plan,
          status: existingLicense.status,
        },
        ipAddress,
        userAgent,
      });

      // Delete license
      const deleted = await this.licenseRepository.delete(licenseId);

      return deleted;
    } catch (error) {
      throw new Error(`Failed to delete license: ${error.message}`);
    }
  }
}
