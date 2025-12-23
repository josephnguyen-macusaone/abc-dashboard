/**
 * Get License Dashboard Metrics Use Case
 * Handles retrieving comprehensive license statistics for dashboard display
 */
export class GetLicenseDashboardMetricsUseCase {
  constructor(licenseRepository) {
    this.licenseRepository = licenseRepository;
  }

  /**
   * Execute get license dashboard metrics use case
   * @param {Object} options - Filter options (date range, etc.)
   * @returns {Promise<Object>} Dashboard metrics including trends and comparisons
   */
  async execute(options = {}) {
    try {
      const now = new Date();
      const filters = options.filters || {};
      const dateRange = options.dateRange || {};

      // Determine the target period based on date range or current month
      let targetPeriodStart, targetPeriodEnd, comparisonPeriodStart, comparisonPeriodEnd;

      if (dateRange.startsAtFrom && dateRange.startsAtTo) {
        // Use the selected date range as the target period
        targetPeriodStart = new Date(dateRange.startsAtFrom);
        targetPeriodEnd = new Date(dateRange.startsAtTo);

        // Calculate comparison period (previous month relative to selected period)
        const targetMonth = targetPeriodStart.getMonth();
        const targetYear = targetPeriodStart.getFullYear();
        comparisonPeriodStart = new Date(targetYear, targetMonth - 1, 1);
        comparisonPeriodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      } else {
        // Default to current month
        targetPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        targetPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        comparisonPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        comparisonPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      }

      // Get all licenses for comprehensive calculations
      const allLicenses = await this.licenseRepository.findLicenses({
        page: 1,
        limit: 10000, // Get all licenses for accurate stats
        filters: {},
      });

      // Get licenses filtered by date range (if provided) - this affects total counts
      const filteredLicenses =
        filters.startsAtFrom || filters.startsAtTo
          ? await this.licenseRepository.findLicenses({
              page: 1,
              limit: 10000,
              filters,
            })
          : allLicenses;

      // Get target period licenses (what the user selected as "this month")
      const targetPeriodLicenses = await this.licenseRepository.findLicenses({
        page: 1,
        limit: 10000,
        filters: {
          startsAtFrom: targetPeriodStart.toISOString(),
          startsAtTo: targetPeriodEnd.toISOString(),
        },
      });

      // Get comparison period licenses (previous month for trend calculation)
      const comparisonPeriodLicenses = await this.licenseRepository.findLicenses({
        page: 1,
        limit: 10000,
        filters: {
          startsAtFrom: comparisonPeriodStart.toISOString(),
          startsAtTo: comparisonPeriodEnd.toISOString(),
        },
      });

      // Calculate metrics
      const metrics = this._calculateMetrics(
        filteredLicenses.licenses,
        targetPeriodLicenses.licenses,
        comparisonPeriodLicenses.licenses,
        allLicenses.licenses,
        targetPeriodStart,
        targetPeriodEnd,
        comparisonPeriodStart,
        comparisonPeriodEnd,
        filters
      );

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    }
  }

  /**
   * Calculate dashboard metrics from license data
   * @private
   */
  _calculateMetrics(
    filteredLicenses,
    targetPeriodLicenses,
    comparisonPeriodLicenses,
    allLicenses,
    targetPeriodStart,
    targetPeriodEnd,
    comparisonPeriodStart,
    comparisonPeriodEnd,
    filters
  ) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total Active Licenses (from filtered set)
    const totalActiveLicenses = filteredLicenses.filter(
      (license) => license.status === 'active'
    ).length;

    const comparisonActiveLicenses = comparisonPeriodLicenses.filter(
      (license) => license.status === 'active'
    ).length;

    // New Licenses This Period (started in target period)
    const newLicensesThisPeriod = targetPeriodLicenses.length;
    const newLicensesComparisonPeriod = comparisonPeriodLicenses.length;

    // License Income This Period (sum of lastPayment for licenses started in target period)
    const licenseIncomeThisPeriod = targetPeriodLicenses.reduce(
      (sum, license) => sum + (parseFloat(license.lastPayment) || 0),
      0
    );

    const licenseIncomeComparisonPeriod = comparisonPeriodLicenses.reduce(
      (sum, license) => sum + (parseFloat(license.lastPayment) || 0),
      0
    );

    // SMS Stats
    const smsSentThisPeriod = targetPeriodLicenses.reduce(
      (sum, license) => sum + (license.smsSent || 0),
      0
    );

    const smsSentComparisonPeriod = comparisonPeriodLicenses.reduce(
      (sum, license) => sum + (license.smsSent || 0),
      0
    );

    const smsRevenuePerMessage = 0.05; // 5 cents per SMS
    const smsIncomeThisPeriod = smsSentThisPeriod * smsRevenuePerMessage;

    // Agent Classification
    const agentHeavyLicenses = filteredLicenses.filter(
      (license) => (license.agents || 0) > 3
    ).length;

    const inHouseLicenses = filteredLicenses.length - agentHeavyLicenses;

    // Calculate comparison period agent classifications for trends
    const comparisonAgentHeavyLicenses = comparisonPeriodLicenses.filter(
      (license) => (license.agents || 0) > 3
    ).length;

    const comparisonInHouseLicenses =
      comparisonPeriodLicenses.length - comparisonAgentHeavyLicenses;

    // High Risk Licenses (no activity in last 7 days)
    const highRiskLicenses = filteredLicenses.filter((license) => {
      if (!license.lastActive) {
        return false;
      }
      const lastActiveDate = new Date(license.lastActive);
      return lastActiveDate < sevenDaysAgo;
    }).length;

    // Estimated Next Month Income
    const averagePayment =
      targetPeriodLicenses.length > 0 ? licenseIncomeThisPeriod / targetPeriodLicenses.length : 0;
    const estimatedNextPeriodIncome =
      licenseIncomeThisPeriod + averagePayment * newLicensesThisPeriod * 0.1; // 10% growth estimate

    // Calculate percentage changes
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) {
        return current === 0 ? 0 : 100;
      }
      return ((current - previous) / previous) * 100;
    };

    return {
      totalActiveLicenses: {
        value: totalActiveLicenses,
        trend: {
          value: Math.abs(calculatePercentageChange(totalActiveLicenses, comparisonActiveLicenses)),
          direction:
            totalActiveLicenses === comparisonActiveLicenses
              ? 'neutral'
              : totalActiveLicenses > comparisonActiveLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      newLicensesThisMonth: {
        value: newLicensesThisPeriod,
        trend: {
          value: Math.abs(
            calculatePercentageChange(newLicensesThisPeriod, newLicensesComparisonPeriod)
          ),
          direction:
            newLicensesThisPeriod === newLicensesComparisonPeriod
              ? 'neutral'
              : newLicensesThisPeriod > newLicensesComparisonPeriod
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      licenseIncomeThisMonth: {
        value: licenseIncomeThisPeriod,
        trend: {
          value: Math.abs(
            calculatePercentageChange(licenseIncomeThisPeriod, licenseIncomeComparisonPeriod)
          ),
          direction:
            licenseIncomeThisPeriod === licenseIncomeComparisonPeriod
              ? 'neutral'
              : licenseIncomeThisPeriod > licenseIncomeComparisonPeriod
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      smsIncomeThisMonth: {
        value: smsIncomeThisPeriod,
        smsSent: smsSentThisPeriod,
        trend: {
          value: Math.abs(calculatePercentageChange(smsSentThisPeriod, smsSentComparisonPeriod)),
          direction:
            smsSentThisPeriod === smsSentComparisonPeriod
              ? 'neutral'
              : smsSentThisPeriod > smsSentComparisonPeriod
                ? 'up'
                : 'down',
          label: 'usage vs last month',
        },
      },
      inHouseLicenses: {
        value: inHouseLicenses,
        trend: {
          value: Math.abs(calculatePercentageChange(inHouseLicenses, comparisonInHouseLicenses)),
          direction:
            inHouseLicenses === comparisonInHouseLicenses
              ? 'neutral'
              : inHouseLicenses > comparisonInHouseLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      agentHeavyLicenses: {
        value: agentHeavyLicenses,
        trend: {
          value: Math.abs(
            calculatePercentageChange(agentHeavyLicenses, comparisonAgentHeavyLicenses)
          ),
          direction:
            agentHeavyLicenses === comparisonAgentHeavyLicenses
              ? 'neutral'
              : agentHeavyLicenses > comparisonAgentHeavyLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      highRiskLicenses: {
        value: highRiskLicenses,
        trend: {
          value: 0,
          direction: 'neutral',
          label: 'auto-updated daily',
        },
      },
      estimatedNextMonthIncome: {
        value: estimatedNextPeriodIncome,
        trend: {
          value: 10,
          direction: 'up',
          label: 'projected',
        },
      },
      // Additional metadata
      metadata: {
        currentPeriod: {
          start: targetPeriodStart.toISOString(),
          end: targetPeriodEnd.toISOString(),
        },
        previousPeriod: {
          start: comparisonPeriodStart.toISOString(),
          end: comparisonPeriodEnd.toISOString(),
        },
        totalLicensesAnalyzed: filteredLicenses.length,
        appliedFilters: !!(filters.startsAtFrom || filters.startsAtTo),
      },
    };
  }
}
