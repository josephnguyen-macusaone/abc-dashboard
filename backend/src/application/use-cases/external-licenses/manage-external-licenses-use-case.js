/**
 * Manage External Licenses Use Case
 * Handles CRUD operations for external licenses stored internally
 */
import { withTimeout, TimeoutPresets } from '../../../shared/utils/reliability/retry.js';
import logger from '../../../infrastructure/config/logger.js';

export class ManageExternalLicensesUseCase {
  constructor(externalLicenseRepository) {
    this.externalLicenseRepository = externalLicenseRepository;
  }

  /**
   * Get licenses with pagination and filtering
   */
  async getLicenses(options = {}) {
    return withTimeout(
      async () => {
        return await this.externalLicenseRepository.findLicenses(options);
      },
      TimeoutPresets.DATABASE,
      'get_external_licenses',
      {
        onTimeout: () => {
          logger.error('Get external licenses timed out', {
            options,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Get single license by ID
   */
  async getLicenseById(id) {
    return await this.externalLicenseRepository.findById(id);
  }

  /**
   * Get license by appid
   */
  async getLicenseByAppId(appid) {
    return await this.externalLicenseRepository.findByAppId(appid);
  }

  /**
   * Get license by email
   */
  async getLicenseByEmail(email) {
    return await this.externalLicenseRepository.findByEmail(email);
  }

  /**
   * Get license by countid
   */
  async getLicenseByCountId(countid) {
    return await this.externalLicenseRepository.findByCountId(countid);
  }

  /**
   * Create new external license
   */
  async createLicense(licenseData) {
    return withTimeout(
      async () => {
        const license = await this.externalLicenseRepository.save(licenseData);

        logger.info('External license created', {
          id: license.id,
          appid: license.appid,
          email: license.Email_license,
        });

        return license;
      },
      TimeoutPresets.DATABASE,
      'create_external_license',
      {
        onTimeout: () => {
          logger.error('Create external license timed out', {
            appid: licenseData.appid,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Update existing license
   */
  async updateLicense(id, updates) {
    return withTimeout(
      async () => {
        const updatedLicense = await this.externalLicenseRepository.update(id, updates);

        if (updatedLicense) {
          logger.info('External license updated', {
            id,
            appid: updatedLicense.appid,
            updatedFields: Object.keys(updates),
          });
        }

        return updatedLicense;
      },
      TimeoutPresets.DATABASE,
      'update_external_license',
      {
        onTimeout: () => {
          logger.error('Update external license timed out', {
            id,
            updateFields: Object.keys(updates),
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Delete license
   */
  async deleteLicense(id) {
    return withTimeout(
      async () => {
        // Get license info before deletion for logging
        const license = await this.externalLicenseRepository.findById(id);

        const deleted = await this.externalLicenseRepository.delete(id);

        if (deleted && license) {
          logger.info('External license deleted', {
            id,
            appid: license.appid,
            email: license.Email_license,
          });
        }

        return deleted;
      },
      TimeoutPresets.DATABASE,
      'delete_external_license',
      {
        onTimeout: () => {
          logger.error('Delete external license timed out', {
            id,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Get license statistics
   */
  async getLicenseStats() {
    return await this.externalLicenseRepository.getLicenseStats();
  }

  /**
   * Get expiring licenses
   */
  async getExpiringLicenses(daysThreshold = 30) {
    return await this.externalLicenseRepository.findExpiringSoonLicenses(daysThreshold);
  }

  /**
   * Get expired licenses
   */
  async getExpiredLicenses() {
    return await this.externalLicenseRepository.findExpiredLicenses();
  }

  /**
   * Get licenses by organization (DBA)
   */
  async getLicensesByOrganization(dba) {
    return await this.externalLicenseRepository.findLicensesByOrganization(dba);
  }

  /**
   * Bulk update licenses
   */
  async bulkUpdateLicenses(updates) {
    return withTimeout(
      async () => {
        const results = await this.externalLicenseRepository.bulkUpdate(updates);

        logger.info('Bulk update external licenses completed', {
          requested: updates.length,
          successful: results.length,
        });

        return results;
      },
      TimeoutPresets.DATABASE,
      'bulk_update_external_licenses',
      {
        onTimeout: () => {
          logger.error('Bulk update external licenses timed out', {
            requested: updates.length,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }

  /**
   * Bulk delete licenses
   */
  async bulkDeleteLicenses(ids) {
    return withTimeout(
      async () => {
        const deletedCount = await this.externalLicenseRepository.bulkDelete(ids);

        logger.info('Bulk delete external licenses completed', {
          requested: ids.length,
          deleted: deletedCount,
        });

        return deletedCount;
      },
      TimeoutPresets.DATABASE,
      'bulk_delete_external_licenses',
      {
        onTimeout: () => {
          logger.error('Bulk delete external licenses timed out', {
            requested: ids.length,
            timeout: TimeoutPresets.DATABASE,
          });
        },
      }
    );
  }
}
