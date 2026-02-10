/**
 * GetLicensesUseCase unit tests with mocked ILicenseRepository
 */

import { License } from '@/domain/entities/license-entity';
import type { ILicenseRepository, LicenseSpecification } from '@/domain/repositories/i-license-repository';
import type { LicenseListQueryDTO } from '@/application/dto/license-dto';
import { GetLicensesUseCaseImpl } from '../get-licenses-usecase';

function createMockLicense(): License {
  return License.fromPersistence({
    id: 'lic-test-1',
    dba: 'Test DBA',
    zip: '12345',
    startsAt: '2025-01-01T00:00:00.000Z',
    status: 'active',
    plan: 'Pro',
    term: 'monthly',
    lastActive: '2025-01-15T00:00:00.000Z',
    seatsTotal: 10,
    seatsUsed: 2,
    lastPayment: 100,
    smsPurchased: 500,
    smsSent: 50,
    agents: 1,
    agentsName: [],
    agentsCost: 10,
    notes: '',
  });
}

function createMockRepository(licenses: License[] = [], total: number = 0): ILicenseRepository {
  return {
    findAll: jest.fn().mockResolvedValue({
      licenses,
      total,
      pagination: {
        page: 1,
        limit: 10,
        totalPages: Math.ceil(total / 10) || 1,
        hasNext: false,
        hasPrev: false,
      },
    }),
    findById: jest.fn(),
    findByDba: jest.fn(),
    findByStatus: jest.fn(),
    findExpiringWithin: jest.fn(),
    findByPlan: jest.fn(),
    search: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    saveAll: jest.fn(),
    delete: jest.fn(),
    getSyncStatus: jest.fn(),
    getDashboardMetrics: jest.fn(),
    getLicensesRequiringAttention: jest.fn(),
    bulkUpdateByIdentifiers: jest.fn(),
    getSmsPayments: jest.fn(),
    addSmsPayment: jest.fn(),
    bulkCreateLicensesRaw: jest.fn(),
    bulkUpdateInternalLicensesRaw: jest.fn(),
  } as unknown as ILicenseRepository;
}

describe('GetLicensesUseCaseImpl', () => {
  it('calls repository findAll with specification derived from params', async () => {
    const mockRepo = createMockRepository();
    const useCase = new GetLicensesUseCaseImpl(mockRepo);
    await useCase.execute({
      page: 1,
      limit: 20,
      search: 'acme',
      dba: 'Acme Inc',
      sortBy: 'dba',
      sortOrder: 'asc',
    });

    expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
    const spec: LicenseSpecification = (mockRepo.findAll as jest.Mock).mock.calls[0][0];
    expect(spec.pagination).toEqual({ page: 1, limit: 20 });
    expect(spec.search).toBe('acme');
    expect(spec.dba).toBeUndefined(); // dba is cleared when search is set
    expect(spec.sort?.field).toBe('dba');
    expect(spec.sort?.direction).toBe('asc');
  });

  it('returns paginated DTOs with licenses mapped from domain entities', async () => {
    const license = createMockLicense();
    const mockRepo = createMockRepository([license], 1);
    const useCase = new GetLicensesUseCaseImpl(mockRepo);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.licenses).toHaveLength(1);
    expect(result.licenses[0]).toMatchObject({
      id: 'lic-test-1',
      dba: 'Test DBA',
      zip: '12345',
      plan: 'Pro',
      term: 'monthly',
      status: 'active',
      seatsTotal: 10,
      seatsUsed: 2,
      smsBalance: 450,
      lastPayment: 100,
    });
    expect(result.licenses[0]).toHaveProperty('startsAt');
    expect(result.licenses[0]).toHaveProperty('expirationDate');
    expect(result.licenses[0]).toHaveProperty('daysUntilExpiration');
    expect(result.licenses[0]).toHaveProperty('isExpiringSoon');
    expect(result.licenses[0]).toHaveProperty('utilizationRate');
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('returns empty list when repository returns no licenses', async () => {
    const mockRepo = createMockRepository([], 0);
    const useCase = new GetLicensesUseCaseImpl(mockRepo);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.licenses).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('throws when repository throws', async () => {
    const mockRepo = createMockRepository();
    (mockRepo.findAll as jest.Mock).mockRejectedValue(new Error('Network error'));
    const useCase = new GetLicensesUseCaseImpl(mockRepo);

    await expect(useCase.execute({})).rejects.toThrow('Failed to fetch licenses');
  });
});
