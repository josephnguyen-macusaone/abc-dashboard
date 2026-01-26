/**
 * Get License Dashboard Metrics Use Case
 * Handles retrieving comprehensive license statistics for dashboard display
 */
import logger from '../../../infrastructure/config/logger.js';

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

      // Merge dateRange into filters for repository queries
      const mergedFilters = {
        ...filters,
        ...(dateRange.startsAtFrom && { startsAtFrom: dateRange.startsAtFrom }),
        ...(dateRange.startsAtTo && { startsAtTo: dateRange.startsAtTo }),
      };

      logger.info('GetLicenseDashboardMetricsUseCase - Options:', { filters: mergedFilters, dateRange });

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
      logger.debug('Fetching all licenses for dashboard metrics calculation');
      let allLicenses;
      try {
        allLicenses = await this.licenseRepository.findLicenses({
          page: 1,
          limit: 10000, // Get all licenses for accurate stats
          filters: {},
        });
        logger.debug('All licenses fetched:', { count: allLicenses?.licenses?.length, total: allLicenses?.total });
      } catch (allLicensesError) {
        logger.error('Failed to fetch all licenses:', { error: allLicensesError.message });
        throw new Error(`Failed to fetch licenses: ${allLicensesError.message}`);
      }

      // Get licenses filtered by date range (if provided) - this affects total counts
      let filteredLicenses;
      try {
        filteredLicenses =
          mergedFilters.startsAtFrom || mergedFilters.startsAtTo
            ? await this.licenseRepository.findLicenses({
                page: 1,
                limit: 10000,
                filters: mergedFilters,
              })
            : allLicenses;
        logger.debug('Date filtering successful');
      } catch (dateFilterError) {
        logger.error('Date filtering failed, using all licenses:', {
          error: dateFilterError.message,
          filters
        });
        filteredLicenses = allLicenses;
      }
      logger.debug('Filtered licenses result:', { count: filteredLicenses?.licenses?.length, total: filteredLicenses?.total });

      // Get target period licenses (what the user selected as "this month")
      let targetPeriodLicenses;
      try {
        targetPeriodLicenses = await this.licenseRepository.findLicenses({
          page: 1,
          limit: 10000,
          filters: {
            startsAtFrom: targetPeriodStart.toISOString(),
            startsAtTo: targetPeriodEnd.toISOString(),
          },
        });
        logger.debug('Target period licenses fetched:', { count: targetPeriodLicenses?.licenses?.length });
      } catch (targetError) {
        logger.error('Failed to fetch target period licenses:', { error: targetError.message });
        targetPeriodLicenses = { licenses: [] };
      }

      // Get comparison period licenses (previous month for trend calculation)
      let comparisonPeriodLicenses;
      try {
        comparisonPeriodLicenses = await this.licenseRepository.findLicenses({
          page: 1,
          limit: 10000,
          filters: {
            startsAtFrom: comparisonPeriodStart.toISOString(),
            startsAtTo: comparisonPeriodEnd.toISOString(),
          },
        });
        logger.debug('Comparison period licenses fetched:', { count: comparisonPeriodLicenses?.licenses?.length });
      } catch (comparisonError) {
        logger.error('Failed to fetch comparison period licenses:', { error: comparisonError.message });
        comparisonPeriodLicenses = { licenses: [] };
      }

      // Calculate metrics
      logger.debug('About to calculate metrics with data:', {
        filteredLicensesCount: filteredLicenses.licenses?.length,
        targetPeriodLicensesCount: targetPeriodLicenses.licenses?.length,
        comparisonPeriodLicensesCount: comparisonPeriodLicenses.licenses?.length,
        allLicensesCount: allLicenses.licenses?.length,
        targetPeriodStart,
        targetPeriodEnd,
        filters
      });

      // Ensure all license arrays exist and are arrays
      const safeFilteredLicenses = filteredLicenses?.licenses || [];
      const safeTargetPeriodLicenses = targetPeriodLicenses?.licenses || [];
      const safeComparisonPeriodLicenses = comparisonPeriodLicenses?.licenses || [];
      const safeAllLicenses = allLicenses?.licenses || [];

      const metrics = this._calculateMetrics(
        safeFilteredLicenses,
        safeTargetPeriodLicenses,
        safeComparisonPeriodLicenses,
        safeAllLicenses,
        targetPeriodStart,
        targetPeriodEnd,
        comparisonPeriodStart,
        comparisonPeriodEnd,
        mergedFilters
      );

      logger.debug('Metrics calculated successfully');
      return metrics;
    } catch (error) {
      logger.error('Error in GetLicenseDashboardMetricsUseCase:', {
        error: error.message,
        stack: error.stack,
        options
      });
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
      (sum, license) => {
        const payment = license.lastPayment != null ? parseFloat(license.lastPayment) : 0;
        return sum + (isNaN(payment) ? 0 : payment);
      },
      0
    );

    const licenseIncomeComparisonPeriod = comparisonPeriodLicenses.reduce(
      (sum, license) => {
        const payment = license.lastPayment != null ? parseFloat(license.lastPayment) : 0;
        return sum + (isNaN(payment) ? 0 : payment);
      },
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
