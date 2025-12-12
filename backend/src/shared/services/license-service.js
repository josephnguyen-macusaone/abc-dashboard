/**
 * License Service Implementation
 * Orchestrates license business operations using use cases
 */
import { ILicenseService } from '../../application/interfaces/i-license-service.js';
import { GetLicensesUseCase } from '../../application/use-cases/licenses/get-licenses-use-case.js';
import { CreateLicenseUseCase } from '../../application/use-cases/licenses/create-license-use-case.js';
import { UpdateLicenseUseCase } from '../../application/use-cases/licenses/update-license-use-case.js';
import { DeleteLicenseUseCase } from '../../application/use-cases/licenses/delete-license-use-case.js';
import { AssignLicenseUseCase } from '../../application/use-cases/licenses/assign-license-use-case.js';
import { RevokeLicenseAssignmentUseCase } from '../../application/use-cases/licenses/revoke-license-assignment-use-case.js';
import { GetLicenseStatsUseCase } from '../../application/use-cases/licenses/get-license-stats-use-case.js';

export class LicenseService extends ILicenseService {
  constructor(licenseRepository, userRepository) {
    super();
    this.licenseRepository = licenseRepository;
    this.userRepository = userRepository;

    // Initialize use cases
    this.getLicensesUseCase = new GetLicensesUseCase(licenseRepository);
    this.createLicenseUseCase = new CreateLicenseUseCase(licenseRepository);
    this.updateLicenseUseCase = new UpdateLicenseUseCase(licenseRepository);
    this.deleteLicenseUseCase = new DeleteLicenseUseCase(licenseRepository);
    this.assignLicenseUseCase = new AssignLicenseUseCase(licenseRepository, userRepository);
    this.revokeLicenseAssignmentUseCase = new RevokeLicenseAssignmentUseCase(licenseRepository);
    this.getLicenseStatsUseCase = new GetLicenseStatsUseCase(licenseRepository);
  }

  /**
   * Get paginated list of licenses with filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated license list
   */
  async getLicenses(options = {}) {
    return await this.getLicensesUseCase.execute(options);
  }

  /**
   * Get license by ID
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} License details
   */
  async getLicenseById(licenseId) {
    const license = await this.licenseRepository.findById(licenseId);
    if (!license) {
      throw new Error('License not found');
    }
    return license.toJSON();
  }

  /**
   * Create a new license
   * @param {Object} licenseData - License creation data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Created license
   */
  async createLicense(licenseData, context) {
    return await this.createLicenseUseCase.execute(licenseData, context);
  }

  /**
   * Update a license
   * @param {string} licenseId - License ID
   * @param {Object} updates - Update data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Updated license
   */
  async updateLicense(licenseId, updates, context) {
    return await this.updateLicenseUseCase.execute(licenseId, updates, context);
  }

  /**
   * Delete a license
   * @param {string} licenseId - License ID
   * @param {Object} context - Request context
   * @returns {Promise<boolean>} Success status
   */
  async deleteLicense(licenseId, context) {
    return await this.deleteLicenseUseCase.execute(licenseId, context);
  }

  /**
   * Assign license to a user
   * @param {Object} assignmentData - Assignment data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Created assignment
   */
  async assignLicense(assignmentData, context) {
    return await this.assignLicenseUseCase.execute(assignmentData, context);
  }

  /**
   * Revoke license assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Revoked assignment
   */
  async revokeAssignment(assignmentId, context) {
    return await this.revokeLicenseAssignmentUseCase.execute(assignmentId, context);
  }

  /**
   * Get license statistics
   * @returns {Promise<Object>} License stats
   */
  async getLicenseStats() {
    return await this.getLicenseStatsUseCase.execute();
  }

  /**
   * Get audit events for a license
   * @param {string} licenseId - License ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Audit events
   */
  async getAuditEvents(licenseId, options) {
    return await this.licenseRepository.findAuditEvents(licenseId, options);
  }
}

export default LicenseService;
