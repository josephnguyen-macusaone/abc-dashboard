/**
 * Get License Dashboard Metrics Use Case
 *
 * Replaced the previous 4 × findLicenses(limit:10000) pattern with two
 * getDashboardAggregates() calls (target period + comparison period).
 * Each call issues a single SQL aggregate query — no full entity rows are
 * loaded into memory.
 */
import logger from '../../../shared/utils/logger.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-license-repository.js').ILicenseRepository} ILicenseRepository */

export class GetLicenseDashboardMetricsUseCase {
  /**
   * @param {ILicenseRepository} licenseRepository
   */
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  async execute(options = {}) {
    try {
      const now = new Date();
      const filters = options.filters || {};
      const dateRange = options.dateRange || {};

      let targetPeriodStart, targetPeriodEnd, comparisonPeriodStart, comparisonPeriodEnd;

      if (dateRange.startsAtFrom && dateRange.startsAtTo) {
        targetPeriodStart = new Date(dateRange.startsAtFrom);
        targetPeriodEnd = new Date(dateRange.startsAtTo);
        const m = targetPeriodStart.getMonth();
        const y = targetPeriodStart.getFullYear();
        comparisonPeriodStart = new Date(y, m - 1, 1);
        comparisonPeriodEnd = new Date(y, m, 0, 23, 59, 59, 999);
      } else {
        targetPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        targetPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        comparisonPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        comparisonPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      }

      logger.debug('GetLicenseDashboardMetricsUseCase executing aggregate queries', {
        filters: Object.keys(filters),
        targetPeriodStart,
        targetPeriodEnd,
      });

      // Two aggregate queries in parallel — replaces 4 × findLicenses(limit:10000)
      const hasCustomDateRange = !!(dateRange.startsAtFrom && dateRange.startsAtTo);

      const [targetAgg, comparisonAgg, allAgg] = await Promise.all([
        this.licenseRepository.getDashboardAggregates(filters, targetPeriodStart, targetPeriodEnd),
        this.licenseRepository.getDashboardAggregates(
          filters,
          comparisonPeriodStart,
          comparisonPeriodEnd
        ),
        // "all" aggregates (no period filter) for active/agentHeavy/highRisk totals
        this.licenseRepository.getDashboardAggregates(filters),
      ]);

      logger.debug('Dashboard aggregates fetched', { targetAgg, comparisonAgg });

      return this._buildMetrics(
        targetAgg,
        comparisonAgg,
        allAgg,
        targetPeriodStart,
        targetPeriodEnd,
        comparisonPeriodStart,
        comparisonPeriodEnd,
        filters,
        hasCustomDateRange
      );
    } catch (error) {
      logger.error('Error in GetLicenseDashboardMetricsUseCase', {
        error: error.message,
        stack: error.stack,
        options,
      });
      throw new Error(`Failed to get dashboard metrics: ${error.message}`, { cause: error });
    }
  }

  _buildMetrics(
    target,
    comparison,
    all,
    targetPeriodStart,
    targetPeriodEnd,
    comparisonPeriodStart,
    comparisonPeriodEnd,
    filters,
    hasCustomDateRange = false
  ) {
    const MAX_TREND = 999;

    const pctChange = (current, previous) => {
      if (previous === 0) {
        return current === 0 ? 0 : Math.min(MAX_TREND, 100);
      }
      const raw = ((current - previous) / previous) * 100;
      return Math.min(MAX_TREND, Math.max(-MAX_TREND, raw));
    };

    const trend = (current, previous, label = 'vs last month') => ({
      value: Math.abs(pctChange(current, previous)),
      direction: current === previous ? 'neutral' : current > previous ? 'up' : 'down',
      label,
    });

    const smsRevenuePerMessage = 0.05;
    const avgPayment = target.total > 0 ? target.income / target.total : 0;
    const estimatedNextPeriod = target.income + avgPayment * target.total * 0.1;

    return {
      totalActiveLicenses: {
        value: all.active,
        trend: trend(all.active, comparison.active),
      },
      newLicensesThisMonth: {
        value: target.total,
        trend: trend(target.total, comparison.total),
      },
      licenseIncomeThisMonth: {
        value: target.income,
        trend: trend(target.income, comparison.income),
      },
      smsIncomeThisMonth: {
        value: target.smsSent * smsRevenuePerMessage,
        smsSent: target.smsSent,
        trend: trend(target.smsSent, comparison.smsSent, 'usage vs last month'),
      },
      inHouseLicenses: {
        value: all.total - all.agentHeavy,
        trend: trend(all.total - all.agentHeavy, comparison.total - comparison.agentHeavy),
      },
      agentHeavyLicenses: {
        value: all.agentHeavy,
        trend: trend(all.agentHeavy, comparison.agentHeavy),
      },
      highRiskLicenses: {
        value: all.highRisk,
        trend: { value: 0, direction: 'neutral', label: 'auto-updated daily' },
      },
      estimatedNextMonthIncome: {
        value: estimatedNextPeriod,
        trend: { value: 10, direction: 'up', label: 'projected' },
      },
      // When no date range is selected, use all-time totals so agents always see
      // their current SMS balance even if licenses were activated in a prior month.
      // When the agent picks a specific date range, use the period aggregate.
      agentSmsStats: {
        smsPurchased: hasCustomDateRange ? target.smsPurchased : all.smsPurchased,
        smsSent: hasCustomDateRange ? target.smsSent : all.smsSent,
        smsBalance: hasCustomDateRange ? target.smsBalance : all.smsBalance,
        agentsCost: hasCustomDateRange ? target.agentsCost : all.agentsCost,
      },
      metadata: {
        currentPeriod: {
          start: targetPeriodStart.toISOString(),
          end: targetPeriodEnd.toISOString(),
        },
        previousPeriod: {
          start: comparisonPeriodStart.toISOString(),
          end: comparisonPeriodEnd.toISOString(),
        },
        totalLicensesAnalyzed: all.total,
        appliedFilters: !!(
          filters.startsAtFrom ||
          filters.startsAtTo ||
          filters.search ||
          filters.status ||
          filters.plan ||
          filters.term ||
          filters.dba ||
          filters.zip
        ),
      },
    };
  }
}
