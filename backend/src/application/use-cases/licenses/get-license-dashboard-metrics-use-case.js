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
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // Get filtered licenses if date range provided
      const filters = options.filters || {};
      
      // Get all licenses for comprehensive calculations
      const allLicenses = await this.licenseRepository.findLicenses({
        page: 1,
        limit: 10000, // Get all licenses for accurate stats
        filters: {},
      });

      // Get licenses filtered by date range (if provided)
      const filteredLicenses = filters.startsAtFrom || filters.startsAtTo
        ? await this.licenseRepository.findLicenses({
            page: 1,
            limit: 10000,
            filters,
          })
        : allLicenses;

      // Get current month licenses (by startsAt)
      const currentMonthLicenses = await this.licenseRepository.findLicenses({
        page: 1,
        limit: 10000,
        filters: {
          startsAtFrom: currentMonthStart.toISOString(),
          startsAtTo: currentMonthEnd.toISOString(),
        },
      });

      // Get previous month licenses (by startsAt)
      const previousMonthLicenses = await this.licenseRepository.findLicenses({
        page: 1,
        limit: 10000,
        filters: {
          startsAtFrom: previousMonthStart.toISOString(),
          startsAtTo: previousMonthEnd.toISOString(),
        },
      });

      // Calculate metrics
      const metrics = this._calculateMetrics(
        filteredLicenses.licenses,
        currentMonthLicenses.licenses,
        previousMonthLicenses.licenses,
        allLicenses.licenses
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
  _calculateMetrics(filteredLicenses, currentMonthLicenses, previousMonthLicenses, allLicenses) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total Active Licenses (from filtered set)
    const totalActiveLicenses = filteredLicenses.filter(
      (license) => license.status === 'active'
    ).length;

    const previousActiveLicenses = previousMonthLicenses.filter(
      (license) => license.status === 'active'
    ).length;

    // New Licenses This Month (started this month)
    const newLicensesThisMonth = currentMonthLicenses.length;
    const newLicensesLastMonth = previousMonthLicenses.length;

    // License Income This Month (sum of lastPayment for licenses started this month)
    const licenseIncomeThisMonth = currentMonthLicenses.reduce(
      (sum, license) => sum + (parseFloat(license.lastPayment) || 0),
      0
    );

    const licenseIncomeLastMonth = previousMonthLicenses.reduce(
      (sum, license) => sum + (parseFloat(license.lastPayment) || 0),
      0
    );

    // SMS Stats
    const smsSentThisMonth = currentMonthLicenses.reduce(
      (sum, license) => sum + (license.smsSent || 0),
      0
    );

    const smsSentLastMonth = previousMonthLicenses.reduce(
      (sum, license) => sum + (license.smsSent || 0),
      0
    );

    const smsRevenuePerMessage = 0.05; // 5 cents per SMS
    const smsIncomeThisMonth = smsSentThisMonth * smsRevenuePerMessage;

    // Agent Classification
    const agentHeavyLicenses = filteredLicenses.filter(
      (license) => (license.agents || 0) > 3
    ).length;

    const inHouseLicenses = filteredLicenses.length - agentHeavyLicenses;

    // High Risk Licenses (no activity in last 7 days)
    const highRiskLicenses = filteredLicenses.filter((license) => {
      if (!license.lastActive) return false;
      const lastActiveDate = new Date(license.lastActive);
      return lastActiveDate < sevenDaysAgo;
    }).length;

    // Estimated Next Month Income
    const averagePayment =
      currentMonthLicenses.length > 0
        ? licenseIncomeThisMonth / currentMonthLicenses.length
        : 0;
    const estimatedNextMonthIncome =
      licenseIncomeThisMonth + averagePayment * newLicensesThisMonth * 0.1; // 10% growth estimate

    // Calculate percentage changes
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalActiveLicenses: {
        value: totalActiveLicenses,
        trend: {
          value: Math.abs(
            calculatePercentageChange(totalActiveLicenses, previousActiveLicenses)
          ),
          direction:
            totalActiveLicenses === previousActiveLicenses
              ? 'neutral'
              : totalActiveLicenses > previousActiveLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      newLicensesThisMonth: {
        value: newLicensesThisMonth,
        trend: {
          value: Math.abs(
            calculatePercentageChange(newLicensesThisMonth, newLicensesLastMonth)
          ),
          direction:
            newLicensesThisMonth === newLicensesLastMonth
              ? 'neutral'
              : newLicensesThisMonth > newLicensesLastMonth
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      licenseIncomeThisMonth: {
        value: licenseIncomeThisMonth,
        trend: {
          value: Math.abs(
            calculatePercentageChange(licenseIncomeThisMonth, licenseIncomeLastMonth)
          ),
          direction:
            licenseIncomeThisMonth === licenseIncomeLastMonth
              ? 'neutral'
              : licenseIncomeThisMonth > licenseIncomeLastMonth
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      smsIncomeThisMonth: {
        value: smsIncomeThisMonth,
        smsSent: smsSentThisMonth,
        trend: {
          value: Math.abs(calculatePercentageChange(smsSentThisMonth, smsSentLastMonth)),
          direction:
            smsSentThisMonth === smsSentLastMonth
              ? 'neutral'
              : smsSentThisMonth > smsSentLastMonth
                ? 'up'
                : 'down',
          label: 'usage vs last month',
        },
      },
      inHouseLicenses: {
        value: inHouseLicenses,
      },
      agentHeavyLicenses: {
        value: agentHeavyLicenses,
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
        value: estimatedNextMonthIncome,
        trend: {
          value: 10,
          direction: 'up',
          label: 'projected',
        },
      },
      // Additional metadata
      metadata: {
        currentPeriod: {
          start: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString(),
          end: new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          ).toISOString(),
        },
        previousPeriod: {
          start: new Date(
            new Date().getFullYear(),
            new Date().getMonth() - 1,
            1
          ).toISOString(),
          end: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            0,
            23,
            59,
            59,
            999
          ).toISOString(),
        },
        totalLicensesAnalyzed: filteredLicenses.length,
        appliedFilters: Object.keys(filteredLicenses).length > 0,
      },
    };
  }
}

