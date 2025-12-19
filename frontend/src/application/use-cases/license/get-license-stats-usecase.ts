import type { LicenseRecord } from '@/shared/types';
import type { DashboardMetrics, DashboardMetricsResponse } from '@/infrastructure/api/types';
import { licenseApi } from '@/infrastructure/api/licenses';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

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
 * Dashboard metrics use case contract
 */
export interface GetLicenseStatsUseCaseContract {
  execute(params: {
    licenses?: LicenseRecord[];
    dateRange?: LicenseDateRange;
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

  constructor() {}

  async execute(params: {
    licenses?: LicenseRecord[];
    dateRange?: LicenseDateRange;
    useApiMetrics?: boolean;
  }): Promise<LicenseDashboardMetric[]> {
    const correlationId = generateCorrelationId();
    const { licenses, dateRange, useApiMetrics = true } = params;

    try {
      // Try API metrics first if requested
      if (useApiMetrics) {
        const apiMetrics = await this.fetchDashboardMetrics(dateRange);
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
   * Fetch dashboard metrics from the backend API
   */
  private async fetchDashboardMetrics(dateRange?: LicenseDateRange): Promise<DashboardMetrics> {
    const params: { startsAtFrom?: string; startsAtTo?: string } = {};

    if (dateRange?.from) {
      params.startsAtFrom = dateRange.from.toISOString();
    }

    if (dateRange?.to) {
      params.startsAtTo = dateRange.to.toISOString();
    }

    const response = await licenseApi.getDashboardMetrics(params);
    return response.data;
  }

  /**
   * Transform backend dashboard metrics to business domain format
   */
  private transformDashboardMetricsToCards(metrics: DashboardMetrics): LicenseDashboardMetric[] {
    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    const numberFormatter = new Intl.NumberFormat('en-US');

    const formatCurrency = (value: number) => {
      // Round to 2 decimal places and format as currency
      const rounded = parseFloat(value.toFixed(2));
      return currencyFormatter.format(rounded);
    };
    const formatNumber = (value: number) => {
      // Round to 2 decimal places and format as number
      const rounded = parseFloat(value.toFixed(2));
      return numberFormatter.format(rounded);
    };

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
      },
      {
        id: 'total-agent-licenses',
        label: 'Total Agent Licenses',
        value: formatNumber(metrics.agentHeavyLicenses.value),
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
   * Build license stats cards from client-side data
   */
  private buildLicenseStatsCards(
    licenses: LicenseRecord[],
    range?: LicenseDateRange,
  ): LicenseDashboardMetric[] {
    const now = new Date();
    const currentMonthStart = this.startOfMonth(now);
    const currentMonthEnd = this.endOfMonth(now);
    const previousMonthStart = this.startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const previousMonthEnd = this.endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const filteredLicenses = this.filterLicensesByDateRange(licenses, range);
    const currentMonthLicenses = this.filterLicensesByDateRange(licenses, {
      from: currentMonthStart,
      to: currentMonthEnd,
    });
    const previousMonthLicenses = this.filterLicensesByDateRange(licenses, {
      from: previousMonthStart,
      to: previousMonthEnd,
    });

    const totalActiveLicenses = filteredLicenses.filter((license) => license.status === 'active').length;
    const previousActiveLicenses = previousMonthLicenses.filter(
      (license) => license.status === 'active',
    ).length;

    const newLicensesThisMonth = currentMonthLicenses.length;
    const newLicensesLastMonth = previousMonthLicenses.length;

    const licenseIncomeThisMonth = currentMonthLicenses.reduce(
      (sum, license) => sum + license.lastPayment,
      0,
    );
    const licenseIncomeLastMonth = previousMonthLicenses.reduce(
      (sum, license) => sum + license.lastPayment,
      0,
    );

    const smsSentThisMonth = currentMonthLicenses.reduce(
      (sum, license) => sum + license.smsSent,
      0,
    );
    const smsSentLastMonth = previousMonthLicenses.reduce(
      (sum, license) => sum + license.smsSent,
      0,
    );
    const smsIncomeThisMonth = smsSentThisMonth * this.smsRevenuePerMessage;

    const agentHeavyLicenses = filteredLicenses.filter((license) => license.agents > 3).length;
    const inHouseLicenses = filteredLicenses.length - agentHeavyLicenses;

    const highRiskLicenses = filteredLicenses.filter((license) => {
      const lastActiveDate = this.parseDate(license.lastActive);
      if (!lastActiveDate) return false;
      const diffMs = now.getTime() - lastActiveDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays > 7;
    }).length;

    const averagePayment =
      currentMonthLicenses.length > 0 ? licenseIncomeThisMonth / currentMonthLicenses.length : 0;
    const estimatedNextMonthIncome = licenseIncomeThisMonth + averagePayment * newLicensesThisMonth;

    const cards: LicenseDashboardMetric[] = [
      {
        id: 'total-active-licenses',
        label: 'Total Active Licenses',
        value: this.formatNumber(totalActiveLicenses),
        trend: {
          value: Math.abs(this.percentageChange(totalActiveLicenses, previousActiveLicenses)),
          direction:
            totalActiveLicenses === previousActiveLicenses
              ? 'neutral'
              : totalActiveLicenses > previousActiveLicenses
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      {
        id: 'new-licenses-month',
        label: 'New Licenses this month',
        value: this.formatNumber(newLicensesThisMonth),
        trend: {
          value: Math.abs(this.percentageChange(newLicensesThisMonth, newLicensesLastMonth)),
          direction:
            newLicensesThisMonth === newLicensesLastMonth
              ? 'neutral'
              : newLicensesThisMonth > newLicensesLastMonth
                ? 'up'
                : 'down',
          label: 'vs last month',
        },
      },
      {
        id: 'licenses-income-month',
        label: 'Total Licenses income this month',
        value: this.formatCurrency(licenseIncomeThisMonth),
        trend: {
          value: Math.abs(this.percentageChange(licenseIncomeThisMonth, licenseIncomeLastMonth)),
          direction:
            licenseIncomeThisMonth === licenseIncomeLastMonth
              ? 'neutral'
              : licenseIncomeThisMonth > licenseIncomeLastMonth
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
          value: Math.abs(this.percentageChange(smsSentThisMonth, smsSentLastMonth)),
          direction:
            smsSentThisMonth === smsSentLastMonth
              ? 'neutral'
              : smsSentThisMonth > smsSentLastMonth
                ? 'up'
                : 'down',
          label: 'usage vs last month',
        },
      },
      {
        id: 'total-inhouse-licenses',
        label: 'Total In-house Licenses',
        value: this.formatNumber(inHouseLicenses),
      },
      {
        id: 'total-agent-licenses',
        label: 'Total Agent Licenses',
        value: this.formatNumber(agentHeavyLicenses),
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
        value: this.formatCurrency(estimatedNextMonthIncome),
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

  private percentageChange(current: number, previous: number) {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    return ((current - previous) / previous) * 100;
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
export function createGetLicenseStatsUseCase(): GetLicenseStatsUseCase {
  return new GetLicenseStatsUseCase();
}