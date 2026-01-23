import {
  License,
  LicenseId,
  CreateLicenseProps,
  PersistenceLicenseProps
} from '@/domain/entities/license-entity';
import { ILicenseRepository, LicenseSpecification, LicenseStatistics } from '@/domain/repositories/i-license-repository';
import { licenseApi } from '@/infrastructure/api/licenses';
import logger from '@/shared/helpers/logger';

/**
 * Infrastructure Repository: License Management
 * Concrete implementation of ILicenseRepository for license management operations
 */
export class LicenseRepository implements ILicenseRepository {
  private readonly logger = {
    ...logger.createChild({ component: 'LicenseRepository' }),
    debug: () => {}, // Silent debug logging for license operations
    info: () => {},  // Silent info logging
  };

  // Simple in-memory cache for frequently accessed data
  private licenseCache = new Map<string, { data: License; timestamp: number }>();
  private statsCache: { data: LicenseStatistics; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get cached license data if still valid
   */
  private getCachedLicense(licenseId: string): License | null {
    const cached = this.licenseCache.get(licenseId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    // Remove expired cache entry
    if (cached) {
      this.licenseCache.delete(licenseId);
    }
    return null;
  }

  /**
   * Cache license data
   */
  private setCachedLicense(licenseId: string, license: License): void {
    this.licenseCache.set(licenseId, { data: license, timestamp: Date.now() });

    // Limit cache size to prevent memory leaks
    if (this.licenseCache.size > 200) {
      const oldestKey = this.licenseCache.keys().next().value;
      if (oldestKey) {
        this.licenseCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get cached stats if still valid
   */
  private getCachedStats(): LicenseStatistics | null {
    if (this.statsCache && Date.now() - this.statsCache.timestamp < this.CACHE_TTL) {
      return this.statsCache.data;
    }
    this.statsCache = null;
    return null;
  }

  /**
   * Cache stats data
   */
  private setCachedStats(stats: LicenseStatistics): void {
    this.statsCache = { data: stats, timestamp: Date.now() };
  }

  /**
   * Clear license cache for a specific license (used after updates)
   */
  private clearLicenseCache(licenseId: string): void {
    this.licenseCache.delete(licenseId);
  }

  /**
   * Clear all license cache (used for bulk operations)
   */
  private clearAllLicenseCache(): void {
    this.licenseCache.clear();
  }

  /**
   * Maps API license data to domain entity
   */
  private mapApiLicenseToDomain(apiLicense: any): License {
    try {
      return License.fromPersistence({
        id: apiLicense.id,
        key: apiLicense.key,
        product: apiLicense.product,
        dba: apiLicense.dba || '',
        zip: apiLicense.zip || '',
        startsAt: apiLicense.startsAt || apiLicense.startDay || new Date().toISOString(),
        status: apiLicense.status || 'pending',
        cancelDate: apiLicense.cancelDate,
        plan: apiLicense.plan || '',
        term: apiLicense.term || 'monthly',
        seatsTotal: apiLicense.seatsTotal || 1,
        seatsUsed: apiLicense.seatsUsed || 0,
        lastPayment: apiLicense.lastPayment || 0,
        lastActive: apiLicense.lastActive || new Date().toISOString(),
        smsPurchased: apiLicense.smsPurchased || 0,
        smsSent: apiLicense.smsSent || 0,
        agents: apiLicense.agents || 0,
        agentsName: apiLicense.agentsName || [],
        agentsCost: apiLicense.agentsCost || 0,
        notes: apiLicense.notes || '',
        createdAt: apiLicense.createdAt,
        updatedAt: apiLicense.updatedAt
      });
    } catch (error) {
      this.logger.error('Failed to map API license to domain', {
        error: error instanceof Error ? error.message : String(error),
        apiLicenseId: apiLicense?.id
      });
      throw error;
    }
  }

  /**
   * Maps domain entity to API format
   */
  private mapDomainToApiLicense(license: License): any {
    return {
      dba: license.dba,
      zip: license.zip,
      startsAt: license.startsAt.toISOString(),
      status: license.status,
      plan: license.plan,
      term: license.term,
      seatsTotal: license.seatsTotal,
      lastPayment: license.lastPayment.getAmount(),
      smsPurchased: license.smsPurchased,
      agents: license.agents,
      agentsName: license.agentsName,
      agentsCost: license.agentsCost.getAmount(),
      notes: license.notes
    };
  }

  /**
   * Maps create props to API format
   */
  private mapCreatePropsToApi(props: CreateLicenseProps): any {
    return {
      dba: props.dba,
      zip: props.zip,
      startsAt: typeof props.startsAt === 'string' ? props.startsAt : props.startsAt.toISOString(),
      plan: props.plan,
      term: props.term,
      seatsTotal: props.seatsTotal || 1,
      lastPayment: props.lastPayment || 0,
      smsPurchased: props.smsPurchased || 0,
      agents: props.agents || 0,
      agentsName: props.agentsName || [],
      agentsCost: props.agentsCost || 0,
      notes: props.notes || ''
    };
  }

  async findById(id: LicenseId): Promise<License | null> {
    // Check cache first
    const cached = this.getCachedLicense(id.toString());
    if (cached) {
      return cached;
    }

    try {
      const apiLicense = await licenseApi.getLicense(id.toString());
      if (!apiLicense) {
        return null;
      }

      const license = this.mapApiLicenseToDomain(apiLicense);
      this.setCachedLicense(id.toString(), license);

      return license;
    } catch (error) {
      this.logger.error('Failed to find license by ID', {
        licenseId: id.toString(),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findByDba(dba: string): Promise<License[]> {
    try {
      const response = await licenseApi.getLicenses({ dba });
      return response.licenses.map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense));
    } catch (error) {
      this.logger.error('Failed to find licenses by DBA', {
        dba,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findByStatus(status: string): Promise<License[]> {
    try {
      const response = await licenseApi.getLicenses({ status: status as any });
      return response.licenses.map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense));
    } catch (error) {
      this.logger.error('Failed to find licenses by status', {
        status,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findExpiringWithin(days: number): Promise<License[]> {
    try {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + days);

      const response = await licenseApi.getLicenses({
        endDate: futureDate.toISOString().split('T')[0]
      });

      // Filter licenses that are expiring within the specified days
      return response.licenses
        .map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense))
        .filter((license: any) => {
          const expirationDate = license.calculateExpirationDate();
          const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiration <= days && daysUntilExpiration > 0;
        });
    } catch (error) {
      this.logger.error('Failed to find licenses expiring within days', {
        days,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findByPlan(plan: string): Promise<License[]> {
    try {
      const response = await licenseApi.getLicenses({ license_type: plan });
      return response.licenses.map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense));
    } catch (error) {
      this.logger.error('Failed to find licenses by plan', {
        plan,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async search(query: string): Promise<License[]> {
    try {
      const response = await licenseApi.getLicenses({});
      return response.licenses.map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense));
    } catch (error) {
      this.logger.error('Failed to search licenses', {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findAll(specification: LicenseSpecification): Promise<{
    licenses: License[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      // Convert specification to API query parameters
      const queryParams: any = {};

      if (specification.dba) {
        queryParams.search = specification.dba;
        queryParams.searchField = 'dba'; // Specify that we're searching in DBA field for precise filtering
      }
      if (specification.status) queryParams.status = specification.status;
      if (specification.plan) queryParams.plan = specification.plan;
      if (specification.term) queryParams.term = specification.term;

      // Handle pagination - use backend pagination
      if (specification.pagination) {
        // Try multiple parameter names that backends commonly use
        const { page, limit } = specification.pagination;

        // 1-based page numbering
        queryParams.page = page;

        // 0-based offset
        queryParams.offset = (page - 1) * limit;

        // Alternative parameter names
        queryParams.limit = limit;
        queryParams.per_page = limit; // Alternative for limit
        queryParams.size = limit;     // Alternative for limit
      }

      const response = await licenseApi.getLicenses(queryParams);
      const licenses = response.licenses.map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense));

      const result = {
        licenses,
        total: response.stats?.total || response.pagination?.total || licenses.length,
        pagination: response.pagination
      };

      return result;
    } catch (error) {
      this.logger.error('Failed to find all licenses', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async count(specification: LicenseSpecification): Promise<number> {
    // Since findAll already returns the total count, we can use that
    // This method is kept for backward compatibility but should be avoided
    // in favor of using findAll() directly
    const result = await this.findAll({
      ...specification,
      pagination: { page: 1, limit: 1 } // Minimal request to get metadata
    });

    return result.total;
  }

  async save(license: License): Promise<void> {
    try {
      const apiData = this.mapDomainToApiLicense(license);
      await licenseApi.updateLicense(license.id.toString(), apiData);

      // Clear cache for this license
      this.clearLicenseCache(license.id.toString());
    } catch (error) {
      this.logger.error('Failed to save license', {
        licenseId: license.id.toString(),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async saveAll(licenses: License[]): Promise<void> {
    // For now, save licenses one by one
    // In a real implementation, this would use a bulk update API
    for (const license of licenses) {
      await this.save(license);
    }
  }

  async delete(id: LicenseId): Promise<void> {
    try {
      // Note: This would need a delete API endpoint
      // For now, this is a placeholder
      this.clearLicenseCache(id.toString());
    } catch (error) {
      this.logger.error('Failed to delete license', {
        licenseId: id.toString(),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async deleteAll(ids: LicenseId[]): Promise<void> {
    // For now, delete licenses one by one
    for (const id of ids) {
      await this.delete(id);
    }
  }

  async exists(id: LicenseId): Promise<boolean> {
    try {
      const license = await this.findById(id);
      return license !== null;
    } catch {
      return false;
    }
  }

  async getStatistics(): Promise<LicenseStatistics> {
    // Check cache first
    const cached = this.getCachedStats();
    if (cached) {
      return cached;
    }

    // Get a sample of licenses for statistics calculation
    // Use a reasonable limit instead of fetching all
    const response = await licenseApi.getLicenses({ limit: 1000 });
    const licenses = response.licenses.map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense));

    // Use API-provided stats if available, otherwise calculate
    let stats: LicenseStatistics;

    if (response.stats) {
      // Use backend stats and enhance with additional calculations
      stats = {
        total: response.stats.total,
        byStatus: {
          active: response.stats.active,
          expired: response.stats.expired,
          pending: response.stats.pending,
          cancel: response.stats.cancel
        },
        byTerm: {}, // API doesn't provide term breakdown
        byPlan: {}, // API doesn't provide plan breakdown
        expiringSoon: 0, // Need to calculate
        expired: response.stats.expired,
        totalSeats: 0,
        usedSeats: 0,
        totalSmsPurchased: 0,
        totalSmsBalance: 0,
        totalRevenue: 0,
        recentActivity: {
          created: 0,
          activated: response.stats.active,
          expired: response.stats.expired,
          cancelled: response.stats.cancel
        }
      };
    } else {
      // Calculate statistics manually
      stats = {
        total: licenses.length,
        byStatus: {},
        byTerm: {},
        byPlan: {},
        expiringSoon: 0,
        expired: 0,
        totalSeats: 0,
        usedSeats: 0,
        totalSmsPurchased: 0,
        totalSmsBalance: 0,
        totalRevenue: 0,
        recentActivity: {
          created: 0,
          activated: 0,
          expired: 0,
          cancelled: 0
        }
      };
    }

    // Always calculate additional stats that API doesn't provide
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    for (const license of licenses) {
      // Enhanced status distribution if not from API
      if (!response.stats) {
        stats.byStatus[license.status] = (stats.byStatus[license.status] || 0) + 1;
      }

      // Term distribution (always calculate)
      stats.byTerm[license.term] = (stats.byTerm[license.term] || 0) + 1;

      // Plan distribution (always calculate)
      stats.byPlan[license.plan] = (stats.byPlan[license.plan] || 0) + 1;

      // Expiration checks (always calculate expiring soon)
      const expirationDate = license.calculateExpirationDate();
      if (expirationDate < now) {
        if (!response.stats) stats.expired++;
      } else if (expirationDate <= thirtyDaysFromNow) {
        stats.expiringSoon++;
      }

      // Seat calculations (always calculate)
      stats.totalSeats += license.seatsTotal;
      stats.usedSeats += license.seatsUsed;

      // SMS calculations (always calculate)
      stats.totalSmsPurchased += license.smsPurchased;
      stats.totalSmsBalance += license.smsBalance;

      // Revenue (always calculate)
      stats.totalRevenue += license.lastPayment.getAmount();
    }

    // Cache the results
    this.setCachedStats(stats);

    return stats;
  }

  async bulkCreate(licenses: CreateLicenseProps[]): Promise<License[]> {
    try {
      const apiLicenses = licenses.map(props => this.mapCreatePropsToApi(props));
      const response = await licenseApi.bulkCreateLicenses(apiLicenses);

      // Map back to domain entities
      const domainLicenses = response.data.results.map((apiLicense: any) => this.mapApiLicenseToDomain(apiLicense));

      // Clear all cache since we added new licenses
      this.clearAllLicenseCache();

      return domainLicenses;
    } catch (error) {
      this.logger.error('Failed to bulk create licenses', {
        count: licenses.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async bulkUpdate(updates: Array<{ id: LicenseId; updates: Partial<PersistenceLicenseProps> }>): Promise<License[]> {
    try {
      // Convert domain updates to API format
      const apiUpdates = updates.map(update => ({
        id: update.id.toString(),
        ...update.updates
      }));

      // Call the bulk API
      const updatedRecords = await licenseApi.bulkUpdateInternalLicenses(apiUpdates);

      // Convert back to domain entities and clear cache
      const updatedLicenses: License[] = [];
      for (const record of updatedRecords) {
        // Clear cache for updated license
        this.clearLicenseCache(record.id.toString());

        // Convert record back to domain entity
        const domainLicense = this.mapApiLicenseToDomain(record);
        updatedLicenses.push(domainLicense);
      }

      return updatedLicenses;
    } catch (error) {
      this.logger.error('Failed to bulk update licenses in repository', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
