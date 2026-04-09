/**
 * Update License Use Case
 * Handles license updates with business rules and audit logging
 */
import { LicenseResponseDto } from '../../dto/license/index.js';
import {
  ValidationException,
  ConcurrentModificationException,
} from '../../../domain/exceptions/domain.exception.js';
import { filterLicenseBodyForRole } from '../../../infrastructure/utils/filter-license-updates-for-role.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-license-repository.js').ILicenseRepository} ILicenseRepository */

export class UpdateLicenseUseCase {
  /**
   * @param {ILicenseRepository} licenseRepository
   */
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  async ensureLicenseCanBeUpdated(licenseId, updates) {
    const existingLicense = await this.licenseRepository.findById(licenseId);
    if (!existingLicense) {
      throw new ValidationException('License not found');
    }

    if (updates.key && updates.key !== existingLicense.key) {
      const keyExists = await this.licenseRepository.keyExists(updates.key, licenseId);
      if (keyExists) {
        throw new ValidationException('License key already exists');
      }
    }

    return existingLicense;
  }

  sanitizeUpdates(updates, expectedUpdatedAt) {
    const {
      lastActive: _lastActive,
      expectedUpdatedAt: updateExpectedUpdatedAt,
      updatedAt: updateUpdatedAt,
      ...safeUpdates
    } = updates;

    return {
      safeUpdates,
      concurrencyToken: expectedUpdatedAt || updateExpectedUpdatedAt || updateUpdatedAt,
    };
  }

  async persistUpdate(licenseId, dataWithAudit, concurrencyToken) {
    if (!concurrencyToken) {
      return this.licenseRepository.update(licenseId, dataWithAudit);
    }

    const updatedLicense = await this.licenseRepository.updateWithExpectedUpdatedAt(
      licenseId,
      dataWithAudit,
      concurrencyToken
    );
    if (updatedLicense) {
      return updatedLicense;
    }

    const latest = await this.licenseRepository.findById(licenseId);
    const latestRecord = latest?.toJSON ? latest.toJSON() : latest;
    throw new ConcurrentModificationException('License', {
      expectedUpdatedAt: concurrencyToken,
      latestRecord: latestRecord || null,
    });
  }

  async emitUpdateAudit({
    userId,
    userRole,
    ipAddress,
    userAgent,
    licenseId,
    updatedLicense,
    updates,
    existingLicense,
  }) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return;
    }
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

  /**
   * Execute update license use case
   * @param {string} licenseId - License ID to update
   * @param {Object} updates - Update data
   * @param {Object} context - Request context (userId, ipAddress, userAgent)
   * @returns {Promise<LicenseResponseDto>} Updated license
   */
  async execute(licenseId, updates, context = {}) {
    const { userId, userRole, ipAddress, userAgent, expectedUpdatedAt } = context;
    const scopedUpdates = filterLicenseBodyForRole(userRole, updates);
    const existingLicense = await this.ensureLicenseCanBeUpdated(licenseId, scopedUpdates);
    const { safeUpdates, concurrencyToken } = this.sanitizeUpdates(
      scopedUpdates,
      expectedUpdatedAt
    );
    const dataWithAudit =
      userId && typeof userId === 'string' && userId.trim() !== ''
        ? { ...safeUpdates, updatedBy: userId }
        : { ...safeUpdates };
    const updatedLicense = await this.persistUpdate(licenseId, dataWithAudit, concurrencyToken);
    await this.emitUpdateAudit({
      userId,
      userRole,
      ipAddress,
      userAgent,
      licenseId,
      updatedLicense,
      updates: safeUpdates,
      existingLicense,
    });
    return LicenseResponseDto.fromEntity(updatedLicense);
  }
}
