/**
 * Get License Dashboard Metrics Use Case - Unit Tests
 * Verifies calculation logic for GET /api/v1/licenses/dashboard/metrics (see docs/guides/dashboard-metrics-verification-plan.md).
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GetLicenseDashboardMetricsUseCase } from '../../../src/application/use-cases/licenses/get-license-dashboard-metrics-use-case.js';

/** Build aggregate object returned by getDashboardAggregates */
const agg = (o = {}) => ({
  total: 0,
  active: 0,
  agentHeavy: 0,
  highRisk: 0,
  income: 0,
  smsSent: 0,
  ...o,
});

describe('GetLicenseDashboardMetricsUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      getDashboardAggregates: jest.fn(),
    };
    useCase = new GetLicenseDashboardMetricsUseCase(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute - with date range', () => {
    it('returns metrics with correct values and like-to-like trends', async () => {
      const targetAgg = agg({
        total: 3,
        active: 2,
        agentHeavy: 1,
        highRisk: 0,
        income: 175,
        smsSent: 15,
      });
      const comparisonAgg = agg({
        total: 2,
        active: 2,
        agentHeavy: 1,
        highRisk: 0,
        income: 120,
        smsSent: 12,
      });
      const allAgg = agg({
        total: 3,
        active: 2,
        agentHeavy: 1,
        highRisk: 0,
        income: 175,
        smsSent: 15,
      });
      mockRepository.getDashboardAggregates
        .mockResolvedValueOnce(targetAgg)
        .mockResolvedValueOnce(comparisonAgg)
        .mockResolvedValueOnce(allAgg);

      const result = await useCase.execute({
        filters: {},
        dateRange: {
          startsAtFrom: '2025-02-01',
          startsAtTo: '2025-02-28',
        },
      });

      // Total Active: all.active=2, comparison.active=2 → neutral 0
      expect(result.totalActiveLicenses.value).toBe(2);
      expect(result.totalActiveLicenses.trend.direction).toBe('neutral');
      expect(result.totalActiveLicenses.trend.value).toBe(0);
      expect(result.totalActiveLicenses.trend.label).toBe('vs last month');

      // New Licenses: target 3, comparison 2 → +50%
      expect(result.newLicensesThisMonth.value).toBe(3);
      expect(result.newLicensesThisMonth.trend.direction).toBe('up');
      expect(result.newLicensesThisMonth.trend.value).toBe(50);

      // License Income: 175 vs 120 → +45.83%
      expect(result.licenseIncomeThisMonth.value).toBe(175);
      expect(result.licenseIncomeThisMonth.trend.direction).toBe('up');
      expect(result.licenseIncomeThisMonth.trend.value).toBeCloseTo(45.83, 1);

      // SMS: 15*0.05=0.75, trend (15-12)/12*100=25
      expect(result.smsIncomeThisMonth.value).toBe(0.75);
      expect(result.smsIncomeThisMonth.trend.direction).toBe('up');
      expect(result.smsIncomeThisMonth.trend.value).toBe(25);

      // Agent heavy 1 vs 1 neutral; in-house (3-1)=2 vs (2-1)=1 → +100%
      expect(result.agentHeavyLicenses.value).toBe(1);
      expect(result.inHouseLicenses.value).toBe(2);
      expect(result.agentHeavyLicenses.trend.direction).toBe('neutral');
      expect(result.inHouseLicenses.trend.direction).toBe('up');
      expect(result.inHouseLicenses.trend.value).toBe(100);

      expect(result.metadata.currentPeriod.start).toContain('2025-02-01');
      expect(result.metadata.currentPeriod.end).toBeDefined();
      expect(result.metadata.previousPeriod.start).toBeDefined();
      expect(result.metadata.previousPeriod.end).toBeDefined();
      expect(result.metadata.totalLicensesAnalyzed).toBe(3);
    });

    it('caps trend percentage at 999', async () => {
      mockRepository.getDashboardAggregates
        .mockResolvedValueOnce(agg({ total: 2, active: 2 }))
        .mockResolvedValueOnce(agg({ total: 1, active: 1 }))
        .mockResolvedValueOnce(agg({ total: 2, active: 2 }));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      expect(result.totalActiveLicenses.value).toBe(2);
      expect(result.totalActiveLicenses.trend.value).toBe(100);
      expect(result.totalActiveLicenses.trend.value).toBeLessThanOrEqual(999);
    });

    it('when comparison previous is 0, trend value is 0 or 100 (capped)', async () => {
      mockRepository.getDashboardAggregates
        .mockResolvedValueOnce(agg({ total: 1, active: 1 }))
        .mockResolvedValueOnce(agg({ total: 0, active: 0 }))
        .mockResolvedValueOnce(agg({ total: 1, active: 1 }));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      expect(result.totalActiveLicenses.value).toBe(1);
      expect(result.totalActiveLicenses.trend.value).toBe(100);
      expect(result.totalActiveLicenses.trend.direction).toBe('up');
    });

    it('high risk uses filtered set (lastActive older than 7 days)', async () => {
      mockRepository.getDashboardAggregates
        .mockResolvedValueOnce(agg({ total: 2, highRisk: 0 }))
        .mockResolvedValueOnce(agg({ total: 0, highRisk: 0 }))
        .mockResolvedValueOnce(agg({ total: 2, highRisk: 1 }));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      expect(result.highRiskLicenses.value).toBe(1);
      expect(result.highRiskLicenses.trend.label).toBe('auto-updated daily');
    });

    it('estimated next month income uses target period income and count', async () => {
      mockRepository.getDashboardAggregates
        .mockResolvedValueOnce(agg({ total: 3, income: 175 }))
        .mockResolvedValueOnce(agg({ total: 2, income: 120 }))
        .mockResolvedValueOnce(agg({ total: 3, income: 175 }));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      // 175 + (175/3)*3*0.1 = 175 + 17.5 = 192.5
      expect(result.estimatedNextMonthIncome.value).toBeCloseTo(192.5, 1);
      expect(result.estimatedNextMonthIncome.trend.label).toBe('projected');
    });
  });

  describe('execute - without date range (current month)', () => {
    it('uses current month as target and previous month as comparison', async () => {
      mockRepository.getDashboardAggregates
        .mockResolvedValueOnce(agg({ total: 1, active: 1 }))
        .mockResolvedValueOnce(agg({ total: 2, active: 2 }))
        .mockResolvedValueOnce(agg({ total: 3, active: 3 }));

      const result = await useCase.execute({ filters: {} });

      expect(result.totalActiveLicenses.value).toBe(3);
      expect(result.totalActiveLicenses.trend.value).toBe(50); // 3 vs 2 → +50%
      expect(result.totalActiveLicenses.trend.direction).toBe('up');
      expect(result.metadata.currentPeriod.start).toBeDefined();
      expect(result.metadata.previousPeriod.start).toBeDefined();
    });
  });

  describe('response shape', () => {
    it('returns all required metric keys with value and trend', async () => {
      const empty = agg();
      mockRepository.getDashboardAggregates
        .mockResolvedValueOnce(empty)
        .mockResolvedValueOnce(empty)
        .mockResolvedValueOnce(empty);

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      const metrics = [
        'totalActiveLicenses',
        'newLicensesThisMonth',
        'licenseIncomeThisMonth',
        'smsIncomeThisMonth',
        'inHouseLicenses',
        'agentHeavyLicenses',
        'highRiskLicenses',
        'estimatedNextMonthIncome',
      ];
      for (const key of metrics) {
        expect(result).toHaveProperty(key);
        expect(result[key]).toHaveProperty('value');
        expect(result[key]).toHaveProperty('trend');
        expect(result[key].trend).toHaveProperty('value');
        expect(result[key].trend).toHaveProperty('direction');
        expect(result[key].trend).toHaveProperty('label');
      }
      expect(result.metadata).toHaveProperty('currentPeriod');
      expect(result.metadata).toHaveProperty('previousPeriod');
      expect(result.metadata).toHaveProperty('totalLicensesAnalyzed');
      expect(result.metadata).toHaveProperty('appliedFilters');
    });
  });
});
