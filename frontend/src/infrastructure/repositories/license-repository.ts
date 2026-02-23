import {
  License,
  LicenseId,
  CreateLicenseProps,
  PersistenceLicenseProps
} from '@/domain/entities/license-entity';
import {
  ILicenseRepository,
  LicenseSpecification,
  LicenseStatistics,
  LicenseSyncStatus,
  type DashboardMetricsParams,
  type LicensesRequiringAttentionResult,
  type BulkIdentifiers,
  type SmsPaymentsParams,
  type SmsPaymentsResult,
  type AddSmsPaymentData,
} from '@/domain/repositories/i-license-repository';
import type { ILicenseApiClient } from '@/infrastructure/api/interfaces/i-license-api-client';
import { createLicenseApiClient } from '@/infrastructure/api/licenses/api-client';
import { extractNotes } from '@/infrastructure/api/licenses/transforms';
import type { InternalLicenseRow } from '@/infrastructure/api/licenses/types';
import type { LicenseRecord } from '@/types';
import logger from '@/shared/helpers/logger';

/** API or list response license shape accepted by the mapper */
type LicenseLike = InternalLicenseRow | LicenseRecord | (Record<string, unknown> & { id?: string | number; dba?: string; zip?: string; startsAt?: string; startDay?: string; status?: string; plan?: string; term?: string });

/**
 * Infrastructure Repository: License Management
 * Concrete implementation of ILicenseRepository for license management operations
 */
export class LicenseRepository implements ILicenseRepository {
  private readonly apiClient: ILicenseApiClient;

  constructor(apiClient?: ILicenseApiClient) {
    this.apiClient = apiClient ?? createLicenseApiClient();
  }

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
  private mapApiLicenseToDomain(apiLicense: LicenseLike): License {
    try {
      const key = apiLicense.key as string | undefined;
      const product = apiLicense.product as string | undefined;
      const cancelDate = apiLicense.cancelDate as string | undefined;
      const raw = apiLicense as Record<string, unknown>;
      const createdAt = raw.createdAt as string | undefined;
      const updatedAt = raw.updatedAt as string | undefined;
      return License.fromPersistence({
        id: String(apiLicense.id ?? ''),
        key,
        product,
        dba: (apiLicense.dba as string) || '',
        zip: (apiLicense.zip as string) || '',
        startsAt: ((apiLicense.startsAt ?? (raw.startDay as string)) as string) || new Date().toISOString(),
        status: (apiLicense.status === 'cancel' || apiLicense.status === 'active' ? apiLicense.status : 'active') as 'active' | 'cancel',
        cancelDate,
        plan: (apiLicense.plan as string) || '',
        term: (apiLicense.term === 'yearly' || apiLicense.term === 'monthly' ? apiLicense.term : 'monthly') as 'monthly' | 'yearly',
        seatsTotal: (apiLicense.seatsTotal as number) || 1,
        seatsUsed: (apiLicense.seatsUsed as number) || 0,
        lastPayment: (apiLicense.lastPayment as number) || 0,
        lastActive: (apiLicense.lastActive as string) || new Date().toISOString(),
        smsPurchased: (apiLicense.smsPurchased as number) || 0,
        smsSent: (apiLicense.smsSent as number) || 0,
        smsBalance: (apiLicense.smsBalance as number) ?? undefined,
        agents: (apiLicense.agents as number) || 0,
        agentsName: (typeof apiLicense.agentsName === 'string' ? apiLicense.agentsName : '') as string,
        agentsCost: (apiLicense.agentsCost as number) || 0,
        notes: extractNotes(apiLicense.notes ?? (apiLicense as Record<string, unknown>).Note),
        createdAt,
        updatedAt
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
  private mapDomainToApiLicense(license: License): Record<string, unknown> {
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
  private mapCreatePropsToApi(props: CreateLicenseProps): Record<string, unknown> {
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
      agentsName: props.agentsName || '',
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
      const response = await this.apiClient.getLicense(id.toString());
      if (!response) return null;
      const data = response && typeof response === 'object' && 'data' in response ? (response as { data?: { license?: LicenseLike } | LicenseLike }).data : undefined;
      const apiLicense: LicenseLike | null = data && typeof data === 'object' && data !== null && 'license' in data
        ? (data as { license: LicenseLike }).license
        : (data as LicenseLike) ?? null;
      if (!apiLicense) return null;

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
      const response = await this.apiClient.getLicenses({ dba });
      return response.licenses.map((apiLicense: LicenseRecord) => this.mapApiLicenseToDomain(apiLicense));
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
      const response = await this.apiClient.getLicenses({ status });
      return response.licenses.map((apiLicense: LicenseRecord) => this.mapApiLicenseToDomain(apiLicense));
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

      const response = await this.apiClient.getLicenses({
        endDate: futureDate.toISOString().split('T')[0]
      });

      return response.licenses
        .map((apiLicense: LicenseRecord) => this.mapApiLicenseToDomain(apiLicense))
        .filter((license: License) => {
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
      const response = await this.apiClient.getLicenses({ license_type: plan });
      return response.licenses.map((apiLicense: LicenseRecord) => this.mapApiLicenseToDomain(apiLicense));
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
      const response = await this.apiClient.getLicenses({});
      return response.licenses.map((apiLicense: LicenseRecord) => this.mapApiLicenseToDomain(apiLicense));
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
      const queryParams: Record<string, string | number | undefined> = {};

      // General search (matches DBA and agent names); only add searchField when explicitly set
      if (specification.search) {
        queryParams.search = specification.search;
        if (specification.searchField) {
          queryParams.searchField = specification.searchField;
        }
      } else if (specification.dba) {
        queryParams.search = specification.dba;
        queryParams.searchField = 'dba';
      }
      if (specification.status) queryParams.status = specification.status;
      if (specification.plan) queryParams.plan = specification.plan;
      if (specification.term) queryParams.term = specification.term;
      if (specification.startsAtFrom) queryParams.startsAtFrom = specification.startsAtFrom;
      if (specification.startsAtTo) queryParams.startsAtTo = specification.startsAtTo;

      if (specification.sort) {
        queryParams.sortBy = specification.sort.field;
        queryParams.sortOrder = specification.sort.direction;
      }

      // Handle pagination - backend expects page and limit only
      if (specification.pagination) {
        const { page, limit } = specification.pagination;
        queryParams.page = page;
        queryParams.limit = limit;
      }

      const response = await this.apiClient.getLicenses(queryParams);
      const licenses = response.licenses.map((apiLicense: LicenseRecord) => this.mapApiLicenseToDomain(apiLicense));

      const result = {
        licenses,
        total: response.pagination.total || licenses.length,
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
      await this.apiClient.updateLicense(license.id.toString(), apiData);

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
    const response = await this.apiClient.getLicenses({ limit: 1000 });
    const licenses = response.licenses.map((apiLicense: LicenseRecord) => this.mapApiLicenseToDomain(apiLicense));

    // Calculate statistics from fetched licenses (API no longer provides stats breakdown)
    const stats: LicenseStatistics = {
      total: response.pagination.total, // Use total from pagination meta
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

    // Calculate detailed stats from licenses
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    for (const license of licenses) {
      // Status distribution
      stats.byStatus[license.status] = (stats.byStatus[license.status] || 0) + 1;

      // Term distribution (always calculate)
      stats.byTerm[license.term] = (stats.byTerm[license.term] || 0) + 1;

      // Plan distribution (always calculate)
      stats.byPlan[license.plan] = (stats.byPlan[license.plan] || 0) + 1;

      // Expiration checks
      const expirationDate = license.calculateExpirationDate();
      if (expirationDate < now) {
        stats.expired++;
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
      const response = await this.apiClient.bulkCreateLicenses(apiLicenses);

      // Map back to domain entities
      const domainLicenses = (response.data.results as LicenseLike[]).map((apiLicense) => this.mapApiLicenseToDomain(apiLicense));

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
      const updatedRecords = await this.apiClient.bulkUpdateInternalLicenses(apiUpdates);

      // Convert back to domain entities and clear cache
      const updatedLicenses: License[] = [];
      for (const record of updatedRecords) {
        const r = record as LicenseLike;
        // Clear cache for updated license
        this.clearLicenseCache(String(r.id ?? ''));

        // Convert record back to domain entity
        const domainLicense = this.mapApiLicenseToDomain(r);
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

  async getSyncStatus(): Promise<LicenseSyncStatus> {
    const response = await this.apiClient.getLicenseSyncStatus();
    return {
      syncInProgress: response.syncInProgress,
      lastSyncResult: response.lastSyncResult
        ? {
            timestamp: response.lastSyncResult.timestamp,
            success: response.lastSyncResult.success,
            error: response.lastSyncResult.error,
            created: response.lastSyncResult.created,
            updated: response.lastSyncResult.updated,
            failed: response.lastSyncResult.failed,
            duration: response.lastSyncResult.duration,
          }
        : undefined,
    };
  }

  async triggerManualSync(): Promise<void> {
    await this.apiClient.triggerSync();
  }

  async getDashboardMetrics(params?: DashboardMetricsParams): Promise<unknown> {
    const response = await this.apiClient.getDashboardMetrics(params as Record<string, unknown> | undefined);
    const data = typeof response === 'object' && response !== null && 'data' in response
      ? (response as { data: unknown }).data
      : response;
    const dataObj = data as { metrics?: unknown } | null;
    return dataObj?.metrics ?? data;
  }

  async getLicensesRequiringAttention(options?: Record<string, unknown>): Promise<LicensesRequiringAttentionResult> {
    const response = await this.apiClient.getLicensesRequiringAttention(options ?? {});
    const data = typeof response === 'object' && response !== null && 'data' in response
      ? (response as { data: unknown }).data
      : response;
    const d = data as { expiringSoon?: unknown[]; expired?: unknown[]; suspended?: unknown[]; total?: number } | null;
    return {
      expiringSoon: d?.expiringSoon ?? [],
      expired: d?.expired ?? [],
      suspended: d?.suspended ?? [],
      total: d?.total ?? 0,
    };
  }

  async bulkUpdateByIdentifiers(identifiers: BulkIdentifiers, updates: Record<string, unknown>): Promise<{ updated: number }> {
    const response = await this.apiClient.bulkUpdateLicenses({ identifiers, updates });
    const data = typeof response === 'object' && response !== null && 'data' in response
      ? (response as { data: { updated?: number } }).data
      : { updated: 0 };
    return { updated: data?.updated ?? 0 };
  }

  async getSmsPayments(params?: SmsPaymentsParams): Promise<SmsPaymentsResult> {
    const response = await this.apiClient.getSmsPayments((params ?? {}) as Record<string, unknown>);
    const data = typeof response === 'object' && response !== null && 'data' in response
      ? (response as { data: { payments?: unknown[]; totals?: unknown; pagination?: unknown } }).data
      : { payments: [], totals: null, pagination: null };
    return {
      payments: data?.payments ?? [],
      totals: data?.totals ?? null,
      pagination: data?.pagination ?? null,
    };
  }

  async addSmsPayment(paymentData: AddSmsPaymentData): Promise<unknown> {
    const response = await this.apiClient.addSmsPayment(paymentData as unknown as Record<string, unknown>);
    return typeof response === 'object' && response !== null && 'data' in response
      ? (response as { data: unknown }).data
      : response;
  }

  async bulkCreateLicensesRaw(licenses: unknown[]): Promise<{ success?: boolean; data?: { results?: unknown[] }; message?: string }> {
    const response = await this.apiClient.bulkCreateLicenses(licenses as never[]);
    return response as { success?: boolean; data?: { results?: unknown[] }; message?: string };
  }

  async bulkUpdateInternalLicensesRaw(updates: unknown[]): Promise<unknown> {
    return await this.apiClient.bulkUpdateInternalLicenses(updates as Array<{ id: string; [key: string]: unknown }>);
  }
}
