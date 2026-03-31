/**
 * External License API Service Interface
 * Defines the contract for external API synchronization operations.
 */
export class IExternalLicenseApiService {
  /**
   * Fetch all external licenses (paginated internally by the service).
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getAllLicenses(options = {}) {
    throw new Error('getAllLicenses not implemented');
  }
}

export default IExternalLicenseApiService;
