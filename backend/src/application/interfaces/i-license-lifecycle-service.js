/**
 * License Lifecycle Service Interface
 * Defines the contract for lifecycle operations used by use-cases.
 */
export class ILicenseLifecycleService {
  /**
   * Renew a license lifecycle.
   * @param {string} licenseId
   * @param {Object} renewalOptions
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async renewLicense(licenseId, renewalOptions = {}, context = {}) {
    throw new Error('renewLicense not implemented');
  }
}

export default ILicenseLifecycleService;
