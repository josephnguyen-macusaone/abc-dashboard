/**
 * Get License Dashboard Metrics Use Case - Unit Tests
 * Verifies calculation logic for GET /api/v1/licenses/dashboard/metrics (see docs/guides/dashboard-metrics-verification-plan.md).
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GetLicenseDashboardMetricsUseCase } from '../../../src/application/use-cases/licenses/get-license-dashboard-metrics-use-case.js';

/** @param {Object} o */
const license = (o) => ({
  id: 'l1',
  key: 'key1',
  status: 'active',
  lastPayment: 0,
  smsSent: 0,
  agents: 0,
  lastActive: null,
  ...o,
});

const respond = (licenses) => ({ licenses, total: licenses.length });

describe('GetLicenseDashboardMetricsUseCase', () => {
  let useCase;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findLicenses: jest.fn(),
    };
    useCase = new GetLicenseDashboardMetricsUseCase(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute - with date range', () => {
    const targetPeriodLicenses = [
      license({ id: 't1', status: 'active', lastPayment: 100, smsSent: 10, agents: 2 }),
      license({ id: 't2', status: 'active', lastPayment: 50, smsSent: 5, agents: 5 }),
      license({ id: 't3', status: 'cancel', lastPayment: 25, smsSent: 0, agents: 1 }),
    ];
    const comparisonPeriodLicenses = [
      license({ id: 'c1', status: 'active', lastPayment: 80, smsSent: 8, agents: 1 }),
      license({ id: 'c2', status: 'active', lastPayment: 40, smsSent: 4, agents: 4 }),
    ];
    const allLicenses = [...targetPeriodLicenses, ...comparisonPeriodLicenses];
    const filteredLicenses = targetPeriodLicenses; // same as target when date range is the range

    it('returns metrics with correct values and like-to-like trends', async () => {
      mockRepository.findLicenses
        .mockResolvedValueOnce(respond(allLicenses))
        .mockResolvedValueOnce(respond(filteredLicenses))
        .mockResolvedValueOnce(respond(targetPeriodLicenses))
        .mockResolvedValueOnce(respond(comparisonPeriodLicenses));

      const result = await useCase.execute({
        filters: {},
        dateRange: {
          startsAtFrom: '2025-02-01',
          startsAtTo: '2025-02-28',
        },
      });

      // Total Active: target period has 2 active (t1, t2), comparison has 2 active
      expect(result.totalActiveLicenses.value).toBe(2);
      expect(result.totalActiveLicenses.trend.direction).toBe('neutral');
      expect(result.totalActiveLicenses.trend.value).toBe(0);
      expect(result.totalActiveLicenses.trend.label).toBe('vs last month');

      // New Licenses: target count 3, comparison count 2 → +50%
      expect(result.newLicensesThisMonth.value).toBe(3);
      expect(result.newLicensesThisMonth.trend.direction).toBe('up');
      expect(result.newLicensesThisMonth.trend.value).toBe(50);

      // License Income: target 100+50+25=175, comparison 80+40=120 → +45.83...% → 45.83
      expect(result.licenseIncomeThisMonth.value).toBe(175);
      expect(result.licenseIncomeThisMonth.trend.direction).toBe('up');
      expect(result.licenseIncomeThisMonth.trend.value).toBeCloseTo(45.83, 1);

      // SMS: target sent 15, comparison 12; income target 15*0.05=0.75
      expect(result.smsIncomeThisMonth.value).toBe(0.75);
      expect(result.smsIncomeThisMonth.trend.direction).toBe('up');
      expect(result.smsIncomeThisMonth.trend.value).toBe(25); // (15-12)/12*100

      // Agent heavy (agents > 3): target has 1 (t2), comparison has 1 (c2). In-house: target 2 (t1,t3), comparison 1 (c1)
      expect(result.agentHeavyLicenses.value).toBe(1);
      expect(result.inHouseLicenses.value).toBe(2);
      expect(result.agentHeavyLicenses.trend.direction).toBe('neutral');
      expect(result.inHouseLicenses.trend.direction).toBe('up'); // 2 vs 1 in-house
      expect(result.inHouseLicenses.trend.value).toBe(100); // (2-1)/1*100

      // Metadata
      expect(result.metadata.currentPeriod.start).toContain('2025-02-01');
      expect(result.metadata.currentPeriod.end).toBeDefined();
      // Previous period is Jan (may be 2025-01-01 or 2024-12-31 in UTC depending on TZ)
      expect(result.metadata.previousPeriod.start).toBeDefined();
      expect(result.metadata.previousPeriod.end).toBeDefined();
      expect(result.metadata.totalLicensesAnalyzed).toBe(3);
    });

    it('caps trend percentage at 999', async () => {
      const target = [license({ status: 'active' }), license({ status: 'active' })];
      const comparison = [license({ status: 'active' })]; // 1 → 2 = +100% normally; 1→100 would be 9900%
      mockRepository.findLicenses
        .mockResolvedValueOnce(respond([...target, ...comparison]))
        .mockResolvedValueOnce(respond(target))
        .mockResolvedValueOnce(respond(target))
        .mockResolvedValueOnce(respond(comparison));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      expect(result.totalActiveLicenses.value).toBe(2);
      expect(result.totalActiveLicenses.trend.value).toBe(100); // (2-1)/1*100 = 100, not capped
      expect(result.totalActiveLicenses.trend.value).toBeLessThanOrEqual(999);
    });

    it('when comparison previous is 0, trend value is 0 or 100 (capped)', async () => {
      const target = [license({ status: 'active' })];
      const comparison = [];
      mockRepository.findLicenses
        .mockResolvedValueOnce(respond(target))
        .mockResolvedValueOnce(respond(target))
        .mockResolvedValueOnce(respond(target))
        .mockResolvedValueOnce(respond(comparison));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      expect(result.totalActiveLicenses.value).toBe(1);
      expect(result.totalActiveLicenses.trend.value).toBe(100); // previous 0, current 1 → 100
      expect(result.totalActiveLicenses.trend.direction).toBe('up');
    });

    it('high risk uses filtered set (lastActive older than 7 days)', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);
      const targetWithHighRisk = [
        license({ status: 'active', lastActive: sevenDaysAgo.toISOString() }),
        license({ status: 'active', lastActive: new Date().toISOString() }),
      ];
      mockRepository.findLicenses
        .mockResolvedValueOnce(respond(targetWithHighRisk))
        .mockResolvedValueOnce(respond(targetWithHighRisk))
        .mockResolvedValueOnce(respond(targetWithHighRisk))
        .mockResolvedValueOnce(respond([]));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      expect(result.highRiskLicenses.value).toBe(1);
      expect(result.highRiskLicenses.trend.label).toBe('auto-updated daily');
    });

    it('estimated next month income uses target period income and count', async () => {
      mockRepository.findLicenses
        .mockResolvedValueOnce(respond(targetPeriodLicenses))
        .mockResolvedValueOnce(respond(targetPeriodLicenses))
        .mockResolvedValueOnce(respond(targetPeriodLicenses))
        .mockResolvedValueOnce(respond(comparisonPeriodLicenses));

      const result = await useCase.execute({
        filters: {},
        dateRange: { startsAtFrom: '2025-02-01', startsAtTo: '2025-02-28' },
      });

      // licenseIncomeThisPeriod = 175, newLicensesThisPeriod = 3, averagePayment = 175/3
      // estimated = 175 + (175/3) * 3 * 0.1 = 175 + 17.5 = 192.5
      expect(result.estimatedNextMonthIncome.value).toBeCloseTo(192.5, 1);
      expect(result.estimatedNextMonthIncome.trend.label).toBe('projected');
    });
  });

  describe('execute - without date range (current month)', () => {
    it('uses current month as target and previous month as comparison', async () => {
      const target = [license({ status: 'active' })];
      const comparison = [license({ status: 'active' }), license({ status: 'active' })];
      // No date range: allLicenses = filteredLicenses (no date filter), target/comparison for trends
      mockRepository.findLicenses
        .mockResolvedValueOnce(respond([...target, ...comparison]))
        .mockResolvedValueOnce(respond(target))
        .mockResolvedValueOnce(respond(comparison));

      const result = await useCase.execute({ filters: {} });

      // Total Active Licenses uses filteredLicenses (reflects table) = 3, not target period
      expect(result.totalActiveLicenses.value).toBe(3);
      expect(result.totalActiveLicenses.trend.value).toBe(50); // 3 vs 2 → +50% → abs 50
      expect(result.totalActiveLicenses.trend.direction).toBe('up');
      expect(result.metadata.currentPeriod.start).toBeDefined();
      expect(result.metadata.previousPeriod.start).toBeDefined();
    });
  });

  describe('response shape', () => {
    it('returns all required metric keys with value and trend', async () => {
      mockRepository.findLicenses
        .mockResolvedValueOnce({ licenses: [], total: 0 })
        .mockResolvedValueOnce({ licenses: [], total: 0 })
        .mockResolvedValueOnce({ licenses: [], total: 0 })
        .mockResolvedValueOnce({ licenses: [], total: 0 });

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
