import type { LicenseRecord } from '@/types';
import type { DashboardMetrics } from '@/infrastructure/api/licenses/types';
import type { ILicenseRepository } from '@/domain/repositories/i-license-repository';
import logger, { generateCorrelationId } from '@/shared/helpers/logger';

/**
 * Date range interface for license filtering
 */
export interface LicenseDateRange {
  from?: Date;
  to?: Date;
}

/**
 * Business domain type for license dashboard metrics
 */
export interface LicenseDashboardMetric {
  id: string;
  label: string;
  value: string; // Formatted string value
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
}

/**
 * Filters for dashboard metrics (same as list filters). When provided, metrics reflect filtered subset.
 */
export interface LicenseMetricsFilters {
  search?: string;
  searchField?: string;
  status?: string | string[];
  plan?: string | string[];
  term?: string | string[];
  dba?: string;
  zip?: string;
  /** Filter by license start date (same as list API). When set, metrics reflect this range. */
  startsAtFrom?: string;
  startsAtTo?: string;
}

/**
 * Transform backend dashboard metrics to business domain format.
 * Exported for reuse when store already has metrics (avoids duplicate API calls).
 */
export function transformDashboardMetricsToCards(metrics: DashboardMetrics): LicenseDashboardMetric[] {
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const numberFormatter = new Intl.NumberFormat('en-US');
  const formatCurrency = (value: number) =>
    currencyFormatter.format(parseFloat(value.toFixed(2)));
  const formatNumber = (value: number) =>
    numberFormatter.format(parseFloat(value.toFixed(2)));

  return [
    {
      id: 'total-active-licenses',
      label: 'Total Active Licenses',
      value: formatNumber(metrics.totalActiveLicenses.value),
      trend: {
        value: metrics.totalActiveLicenses.trend.value,
        direction: metrics.totalActiveLicenses.trend.direction,
        label: metrics.totalActiveLicenses.trend.label,
      },
    },
    {
      id: 'new-licenses-month',
      label: 'New Licenses this month',
      value: formatNumber(metrics.newLicensesThisMonth.value),
      trend: {
        value: metrics.newLicensesThisMonth.trend.value,
        direction: metrics.newLicensesThisMonth.trend.direction,
        label: metrics.newLicensesThisMonth.trend.label,
      },
    },
    {
      id: 'licenses-income-month',
      label: 'Total Licenses income this month',
      value: formatCurrency(metrics.licenseIncomeThisMonth.value),
      trend: {
        value: metrics.licenseIncomeThisMonth.trend.value,
        direction: metrics.licenseIncomeThisMonth.trend.direction,
        label: metrics.licenseIncomeThisMonth.trend.label,
      },
    },
    {
      id: 'sms-income-month',
      label: 'Total SMS income this month',
      value: formatCurrency(metrics.smsIncomeThisMonth.value),
      trend: {
        value: metrics.smsIncomeThisMonth.trend.value,
        direction: metrics.smsIncomeThisMonth.trend.direction,
        label: metrics.smsIncomeThisMonth.trend.label,
      },
    },
    {
      id: 'total-inhouse-licenses',
      label: 'Total In-house Licenses',
      value: formatNumber(metrics.inHouseLicenses.value),
      trend: { value: 0, direction: 'neutral' as const, label: 'vs last month' },
    },
    {
      id: 'total-agent-licenses',
      label: 'Total Agent Licenses',
      value: formatNumber(metrics.agentHeavyLicenses.value),
      trend: { value: 0, direction: 'neutral' as const, label: 'vs last month' },
    },
    {
      id: 'high-risk-licenses',
      label: 'Total High Risk (7 days no active)',
      value: formatNumber(metrics.highRiskLicenses.value),
      trend: {
        value: metrics.highRiskLicenses.trend.value,
        direction: metrics.highRiskLicenses.trend.direction,
        label: metrics.highRiskLicenses.trend.label,
      },
    },
    {
      id: 'estimate-next-month',
      label: 'Estimate next month Licenses income',
      value: formatCurrency(metrics.estimatedNextMonthIncome.value),
      trend: {
        value: metrics.estimatedNextMonthIncome.trend.value,
        direction: metrics.estimatedNextMonthIncome.trend.direction,
        label: metrics.estimatedNextMonthIncome.trend.label,
      },
    },
  ];
}

/**
 * Dashboard metrics use case contract
 */
export interface GetLicenseStatsUseCaseContract {
  execute(params: {
    licenses?: LicenseRecord[];
    dateRange?: LicenseDateRange;
    filters?: LicenseMetricsFilters;
    useApiMetrics?: boolean;
  }): Promise<LicenseDashboardMetric[]>;
}

/**
 * Application Use Case: Get License Stats
 * Handles fetching and calculating dashboard metrics for license management
 */
export class GetLicenseStatsUseCase implements GetLicenseStatsUseCaseContract {
  private readonly useCaseLogger = logger.createChild({
    component: 'GetLicenseStatsUseCase',
  });

  constructor(private readonly licenseRepository: ILicenseRepository) {}

  async execute(params: {
    licenses?: LicenseRecord[];
    dateRange?: LicenseDateRange;
    filters?: LicenseMetricsFilters;
    useApiMetrics?: boolean;
  }): Promise<LicenseDashboardMetric[]> {
    const correlationId = generateCorrelationId();
    const { licenses, dateRange, filters, useApiMetrics = true } = params;

    try {
      // Try API metrics first if requested
      if (useApiMetrics) {
        const apiMetrics = await this.fetchDashboardMetrics(dateRange, filters);
        return this.transformDashboardMetricsToCards(apiMetrics);
      }
    } catch (error) {
      this.useCaseLogger.warn('API metrics fetch failed, falling back to client-side calculation', {
        correlationId,
        dateRange,
        operation: 'api_metrics_fallback',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Fallback to client-side calculation
    if (!licenses) {
      this.useCaseLogger.error('Licenses data required for client-side calculation', {
        correlationId,
        operation: 'client_calculation_missing_data',
      });
      throw new Error('Licenses data is required for client-side calculation');
    }

    try {
      const result = this.buildLicenseStatsCards(licenses, dateRange);
      return result;
    } catch (error) {
      this.useCaseLogger.error('Client-side calculation failed', {
        correlationId,
        licenseCount: licenses?.length,
        dateRange,
        operation: 'client_calculation_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch dashboard metrics from the backend API. Pass filters so metrics reflect filtered subset.
   */
  private async fetchDashboardMetrics(
    dateRange?: LicenseDateRange,
    filters?: LicenseMetricsFilters
  ): Promise<DashboardMetrics> {
    const params: {
      startsAtFrom?: string;
      startsAtTo?: string;
      search?: string;
      searchField?: string;
      status?: string | string[];
      plan?: string | string[];
      term?: string | string[];
      dba?: string;
      zip?: string;
    } = {};

    // Date range: prefer filters from store (single source of truth), fallback to dateRange prop
    if (filters?.startsAtFrom) {
      params.startsAtFrom = filters.startsAtFrom;
    } else if (dateRange?.from) {
      params.startsAtFrom = dateRange.from.toISOString().split('T')[0];
    }
    if (filters?.startsAtTo) {
      params.startsAtTo = filters.startsAtTo;
    } else if (dateRange?.to) {
      params.startsAtTo = dateRange.to.toISOString().split('T')[0];
    }
    if (filters?.search) {
      params.search = filters.search;
    }
    if (filters?.searchField) {
      params.searchField = filters.searchField;
    }
    if (filters?.status !== undefined && filters?.status !== null) {
      params.status = filters.status;
    }
    if (filters?.plan !== undefined && filters?.plan !== null) {
      params.plan = filters.plan;
    }
    if (filters?.term !== undefined && filters?.term !== null) {
      params.term = filters.term;
    }
    if (filters?.dba) {
      params.dba = filters.dba;
    }
    if (filters?.zip) {
      params.zip = filters.zip;
    }

    const metricsPayload = await this.licenseRepository.getDashboardMetrics(params);
    return metricsPayload as DashboardMetrics;
  }

  /**
   * Transform backend dashboard metrics to business domain format
   */
  private transformDashboardMetricsToCards(metrics: DashboardMetrics): LicenseDashboardMetric[] {
    return transformDashboardMetricsToCards(metrics);
  }

  /**
   * Build license stats cards from client-side data
   */
  private buildLicenseStatsCards(
    licenses: LicenseRecord[],
    range?: LicenseDateRange,
  ): LicenseDashboardMetric[] {
    const now = new Date();

    // Determine the target period based on range or current month
    let targetPeriodStart, targetPeriodEnd, comparisonPeriodStart, comparisonPeriodEnd;

    if (range?.from && range?.to) {
      // Use the selected date range as the target period
      targetPeriodStart = range.from;
      targetPeriodEnd = range.to;

      // Calculate comparison period (previous month relative to selected period)
      const targetMonth = targetPeriodStart.getMonth();
      const targetYear = targetPeriodStart.getFullYear();
      comparisonPeriodStart = new Date(targetYear, targetMonth - 1, 1);
      comparisonPeriodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      targetPeriodStart = this.startOfMonth(now);
      targetPeriodEnd = this.endOfMonth(now);
      comparisonPeriodStart = this.startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      comparisonPeriodEnd = this.endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    }

    const filteredLicenses = this.filterLicensesByDateRange(licenses, range);
    const targetPeriodLicenses = this.filterLicensesByDateRange(licenses, {
      from: targetPeriodStart,
      to: targetPeriodEnd,
    });
    const comparisonPeriodLicenses = this.filterLicensesByDateRange(licenses, {
      from: comparisonPeriodStart,
      to: comparisonPeriodEnd,
    });

    // Use target period (not filtered) so trend compares like-to-like (avoids comparing "all active" to "last month").
    const totalActiveLicenses = targetPeriodLicenses.filter((license) => license.status === 'active').length;
    const comparisonActiveLicenses = comparisonPeriodLicenses.filter(
      (license) => license.status === 'active',
    ).length;

    const newLicensesThisPeriod = targetPeriodLicenses.length;
    const newLicensesComparisonPeriod = comparisonPeriodLicenses.length;

    const licenseIncomeThisPeriod = targetPeriodLicenses.reduce(
      (sum, license) => sum + license.lastPayment,
      0,
    );
    const licenseIncomeComparisonPeriod = comparisonPeriodLicenses.reduce(
      (sum, license) => sum + license.lastPayment,
      0,
    );

    const smsSentThisPeriod = targetPeriodLicenses.reduce(
      (sum, license) => sum + license.smsSent,
      0,
    );
    const smsSentComparisonPeriod = comparisonPeriodLicenses.reduce(
      (sum, license) => sum + license.smsSent,
      0,
    );
    const smsIncomeThisMonth = smsSentThisPeriod * this.smsRevenuePerMessage;

    // Use target period for value so trend is like-to-like.
    const agentHeavyLicenses = targetPeriodLicenses.filter((license) => license.agents > 3).length;
    const inHouseLicenses = targetPeriodLicenses.length - agentHeavyLicenses;

    // Comparison period for trend
    const comparisonAgentHeavyLicenses = comparisonPeriodLicenses.filter((license) => license.agents > 3).length;
    const comparisonInHouseLicenses = comparisonPeriodLicenses.length - comparisonAgentHeavyLicenses;

    // High risk: of the filtered (in-view) set
    const highRiskLicenses = filteredLicenses.filter((license) => {
      const lastActiveDate = this.parseDate(license.lastActive);
      if (!lastActiveDate) return false;
      const diffMs = now.getTime() - lastActiveDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > 7;
    }).length;

    const averagePayment =
      targetPeriodLicenses.length > 0 ? licenseIncomeThisPeriod / targetPeriodLicenses.length : 0;
    const estimatedNextPeriodIncome = licenseIncomeThisPeriod + averagePayment * newLicensesThisPeriod;

    const cards: LicenseDashboardMetric[] = [
      {
        id: 'total-active-licenses',
        label: 'Total Active Licenses',
        value: this.formatNumber(totalActiveLicenses),
        trend: {
          value: Math.abs(this.percentageChange(totalActiveLicenses, comparisonActiveLicenses)),
          direction:
            totalActiveLicenses === comparisonActiveLicenses
              ? 'neutral'
              : totalActiveLicenses > comparisonActiveLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      {
        id: 'new-licenses-month',
        label: 'New Licenses this month',
        value: this.formatNumber(newLicensesThisPeriod),
        trend: {
          value: Math.abs(this.percentageChange(newLicensesThisPeriod, newLicensesComparisonPeriod)),
          direction:
            newLicensesThisPeriod === newLicensesComparisonPeriod
              ? 'neutral'
              : newLicensesThisPeriod > newLicensesComparisonPeriod
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      {
        id: 'licenses-income-month',
        label: 'Total Licenses income this month',
        value: this.formatCurrency(licenseIncomeThisPeriod),
        trend: {
          value: Math.abs(this.percentageChange(licenseIncomeThisPeriod, licenseIncomeComparisonPeriod)),
          direction:
            licenseIncomeThisPeriod === licenseIncomeComparisonPeriod
              ? 'neutral'
              : licenseIncomeThisPeriod > licenseIncomeComparisonPeriod
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      {
        id: 'sms-income-month',
        label: 'Total SMS income this month',
        value: this.formatCurrency(smsIncomeThisMonth),
        trend: {
          value: Math.abs(this.percentageChange(smsSentThisPeriod, smsSentComparisonPeriod)),
          direction:
            smsSentThisPeriod === smsSentComparisonPeriod
              ? 'neutral'
              : smsSentThisPeriod > smsSentComparisonPeriod
                ? 'up'
                : 'down',
          label: 'usage vs last month',
        },
      },
      {
        id: 'total-inhouse-licenses',
        label: 'Total In-house Licenses',
        value: this.formatNumber(inHouseLicenses),
        trend: {
          value: Math.abs(this.percentageChange(inHouseLicenses, comparisonInHouseLicenses)),
          direction:
            inHouseLicenses === comparisonInHouseLicenses
              ? 'neutral'
              : inHouseLicenses > comparisonInHouseLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      {
        id: 'total-agent-licenses',
        label: 'Total Agent Licenses',
        value: this.formatNumber(agentHeavyLicenses),
        trend: {
          value: Math.abs(this.percentageChange(agentHeavyLicenses, comparisonAgentHeavyLicenses)),
          direction:
            agentHeavyLicenses === comparisonAgentHeavyLicenses
              ? 'neutral'
              : agentHeavyLicenses > comparisonAgentHeavyLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      {
        id: 'high-risk-licenses',
        label: 'Total High Risk (7 days no active)',
        value: this.formatNumber(highRiskLicenses),
        trend: {
          value: 0,
          direction: 'neutral',
          label: 'auto-updated daily',
        },
      },
      {
        id: 'estimate-next-month',
        label: 'Estimate next month Licenses income',
        value: this.formatCurrency(estimatedNextPeriodIncome),
        trend: {
          value: 10,
          direction: 'up',
          label: 'projected',
        },
      },
    ];

    return cards;
  }

  // Utility methods
  private readonly smsRevenuePerMessage = 0.05; // 5 cents per SMS

  private readonly currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  private readonly numberFormatter = new Intl.NumberFormat('en-US');

  private parseDate(value?: string) {
    return value ? new Date(value) : null;
  }

  private isWithinRange(date: Date, from?: Date, to?: Date) {
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /** Cap trend at ±999% so small comparison bases don't show e.g. 2860%. */
  private static readonly MAX_TREND_PERCENT = 999;

  private percentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current === 0 ? 0 : Math.min(GetLicenseStatsUseCase.MAX_TREND_PERCENT, 100);
    }
    const raw = ((current - previous) / previous) * 100;
    return Math.min(
      GetLicenseStatsUseCase.MAX_TREND_PERCENT,
      Math.max(-GetLicenseStatsUseCase.MAX_TREND_PERCENT, raw),
    );
  }

  private formatCurrency(value: number) {
    const rounded = parseFloat(value.toFixed(2));
    return this.currencyFormatter.format(rounded);
  }

  private formatNumber(value: number) {
    const rounded = parseFloat(value.toFixed(2));
    return this.numberFormatter.format(rounded);
  }

  private filterLicensesByDateRange(
    licenses: LicenseRecord[],
    range?: LicenseDateRange,
  ): LicenseRecord[] {
    if (!range?.from && !range?.to) return licenses;

    const endDate = range.to
      ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate(), 23, 59, 59, 999)
      : undefined;

    return licenses.filter((license) => {
      const startDate = this.parseDate(license.startsAt);
      if (!startDate) return false;
      return this.isWithinRange(startDate, range.from, endDate);
    });
  }
}

/**
 * Factory function to create GetLicenseStatsUseCase
 */
export function createGetLicenseStatsUseCase(licenseRepository: ILicenseRepository): GetLicenseStatsUseCase {
  return new GetLicenseStatsUseCase(licenseRepository);
}