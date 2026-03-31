/**
 * Update License Use Case
 * Handles license updates with business rules and audit logging
 */
import { LicenseResponseDto } from '../../dto/license/index.js';
import {
  ValidationException,
  ConcurrentModificationException,
} from '../../../domain/exceptions/domain.exception.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-license-repository.js').ILicenseRepository} ILicenseRepository */

export class UpdateLicenseUseCase {
  /**
   * @param {ILicenseRepository} licenseRepository
   */
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
    const { userId, userRole, ipAddress, userAgent, expectedUpdatedAt } = context;

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

      // Strip lastActive: only the external sync process is allowed to update it.
      // expectedUpdatedAt is a concurrency token and must not be persisted.
      const {
        lastActive: _lastActive,
        expectedUpdatedAt: updateExpectedUpdatedAt,
        updatedAt: updateUpdatedAt,
        ...safeUpdates
      } = updates;
      const concurrencyToken = expectedUpdatedAt || updateExpectedUpdatedAt || updateUpdatedAt;

      // Add audit fields
      const dataWithAudit = {
        ...safeUpdates,
        updatedBy: userId,
      };

      // Update with optimistic concurrency if token provided
      let updatedLicense = null;
      if (concurrencyToken) {
        updatedLicense = await this.licenseRepository.updateWithExpectedUpdatedAt(
          licenseId,
          dataWithAudit,
          concurrencyToken
        );
        if (!updatedLicense) {
          const latest = await this.licenseRepository.findById(licenseId);
          const latestRecord = latest?.toJSON ? latest.toJSON() : latest;
          throw new ConcurrentModificationException('License', {
            expectedUpdatedAt: concurrencyToken,
            latestRecord: latestRecord || null,
          });
        }
      } else {
        updatedLicense = await this.licenseRepository.update(licenseId, dataWithAudit);
      }

      // Always emit an audit record for write operations to preserve a complete trail.
      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        await this.licenseRepository.createAuditEvent({
          type: 'license.updated',
          actorId: userId,
          entityId: licenseId,
          entityType: 'license',
          metadata: {
            action: 'update',
            actorRole: userRole || null,
            updatedBy: userId,
            timestamp: new Date().toISOString(),
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
      throw error;
    }
  }
}
