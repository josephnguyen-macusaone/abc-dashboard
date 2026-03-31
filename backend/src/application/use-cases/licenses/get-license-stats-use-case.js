/**
 * Get License Stats Use Case
 * Handles retrieving license statistics
 */
/** @typedef {import('../../../domain/repositories/interfaces/i-license-repository.js').ILicenseRepository} ILicenseRepository */

export class GetLicenseStatsUseCase {
  /**
   * @param {ILicenseRepository} licenseRepository
   */
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute get license stats use case
   * @returns {Promise<Object>} License statistics
   */
  async execute() {
    try {
      const stats = await this.licenseRepository.getLicenseStats();

      return {
        totalLicenses: stats.totalLicenses,
        active: stats.active,
        expired: stats.expired,
        expiring: stats.expiring,
        seats: {
          total: stats.totalSeats,
          used: stats.usedSeats,
          available: stats.availableSeats,
          utilizationPercent:
            stats.totalSeats > 0 ? Math.round((stats.usedSeats / stats.totalSeats) * 100) : 0,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get license stats: ${error.message}`, { cause: error });
    }
  }
}
