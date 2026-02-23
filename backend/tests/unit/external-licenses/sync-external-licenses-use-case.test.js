/**
 * Sync External Licenses Use Case - Unit Tests
 * Verifies sync execution with mocked external API and repositories.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SyncExternalLicensesUseCase } from '../../../src/application/use-cases/external-licenses/sync-external-licenses-use-case.js';

const mockExternalLicense = {
  countid: 1001,
  appid: 'app-123',
  dba: 'Test DBA',
  zip: '12345',
  status: 1,
  license_type: 'product',
  monthlyFee: 29.99,
  ActivateDate: '2025-01-15',
  comingExpired: '2025-12-31',
  emailLicense: 'test@example.com',
};

describe('SyncExternalLicensesUseCase', () => {
  let useCase;
  let mockExternalRepo;
  let mockExternalApi;
  let mockInternalRepo;

  beforeEach(() => {
    mockExternalRepo = {
      bulkUpsert: jest.fn().mockResolvedValue({ created: 1, updated: 0, errors: [] }),
      getSyncStats: jest.fn().mockResolvedValue({
        totalLicenses: 10,
        lastSync: new Date().toISOString(),
        syncStatus: 'synced',
      }),
      syncToInternalLicenses: jest.fn().mockResolvedValue({
        syncedCount: 5,
        updatedCount: 2,
        createdCount: 3,
      }),
    };

    mockExternalApi = {
      getAllLicenses: jest.fn().mockResolvedValue({
        success: true,
        data: [mockExternalLicense],
        meta: { pagesFetched: 1 },
      }),
      healthCheck: jest.fn().mockResolvedValue({
        healthy: true,
        timestamp: new Date().toISOString(),
        error: null,
      }),
    };

    mockInternalRepo = null;

    useCase = new SyncExternalLicensesUseCase(mockExternalRepo, mockExternalApi, mockInternalRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('returns success when external API returns data and sync completes', async () => {
      const result = await useCase.execute({ batchSize: 10 });

      expect(result.success).toBe(true);
      expect(result.totalFetched).toBe(1);
      expect(mockExternalApi.getAllLicenses).toHaveBeenCalledWith(
        expect.objectContaining({ batchSize: 10 })
      );
      expect(mockExternalRepo.bulkUpsert).toHaveBeenCalled();
    });

    it('with dryRun: true returns validated count without persisting', async () => {
      const result = await useCase.execute({ dryRun: true, batchSize: 10 });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.validatedLicenses).toBe(1);
      expect(mockExternalApi.getAllLicenses).toHaveBeenCalled();
      expect(mockExternalRepo.bulkUpsert).not.toHaveBeenCalled();
    });

    it('with syncToInternalOnly: true skips external API fetch', async () => {
      mockInternalRepo = {};
      mockExternalRepo.syncToInternalLicenses = jest.fn().mockResolvedValue({
        syncedCount: 0,
        updatedCount: 0,
        createdCount: 0,
      });
      const useCaseInternal = new SyncExternalLicensesUseCase(
        mockExternalRepo,
        mockExternalApi,
        mockInternalRepo
      );

      const result = await useCaseInternal.execute({
        syncToInternalOnly: true,
        dryRun: false,
        comprehensive: false,
      });

      expect(result.success).toBe(true);
      expect(mockExternalApi.getAllLicenses).not.toHaveBeenCalled();
    });

    it('handles external API errors gracefully', async () => {
      mockExternalApi.getAllLicenses.mockResolvedValue({
        success: false,
        error: '401 Unauthorized',
      });

      const result = await useCase.execute({ dryRun: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch licenses');
    });

    it('dryRun with API failure returns apiStatus', async () => {
      mockExternalApi.getAllLicenses.mockResolvedValue({
        success: false,
        error: '401 Unauthorized',
      });

      const result = await useCase.execute({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.apiStatus).toBeDefined();
      expect(result.apiStatus.authenticated).toBe(false);
    });
  });

  describe('getSyncStatus', () => {
    it('returns status with internal and external health', async () => {
      const result = await useCase.getSyncStatus();

      expect(result.success).toBe(true);
      expect(result.internal).toBeDefined();
      expect(result.internal.totalLicenses).toBe(10);
      expect(result.external).toBeDefined();
      expect(result.external.healthy).toBe(true);
      expect(mockExternalRepo.getSyncStats).toHaveBeenCalled();
      expect(mockExternalApi.healthCheck).toHaveBeenCalled();
    });
  });
});
