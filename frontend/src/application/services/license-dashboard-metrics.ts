import type { StatsCardConfig } from '@/presentation/components/molecules/domain/user-management';
import type { LicenseRecord } from '@/shared/types';
import {
  AlertTriangle,
  Building,
  DollarSign,
  Phone,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';

export interface LicenseDateRange {
  from?: Date;
  to?: Date;
}

const smsRevenuePerMessage = 0.05; // 5 cents per SMS

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US');

function parseDate(value?: string) {
  return value ? new Date(value) : null;
}

function isWithinRange(date: Date, from?: Date, to?: Date) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function filterLicensesByDateRange(
  licenses: LicenseRecord[],
  range?: LicenseDateRange,
): LicenseRecord[] {
  if (!range?.from && !range?.to) return licenses;

  const endDate = range.to
    ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate(), 23, 59, 59, 999)
    : undefined;

  return licenses.filter((license) => {
    const startDate = parseDate(license.startsAt);
    if (!startDate) return false;
    return isWithinRange(startDate, range.from, endDate);
  });
}

export function buildLicenseStatsCards(
  licenses: LicenseRecord[],
  range?: LicenseDateRange,
  _totalCount?: number, // kept for API compatibility
): StatsCardConfig[] {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const previousMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const previousMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const filteredLicenses = filterLicensesByDateRange(licenses, range);
  const currentMonthLicenses = filterLicensesByDateRange(licenses, {
    from: currentMonthStart,
    to: currentMonthEnd,
  });
  const previousMonthLicenses = filterLicensesByDateRange(licenses, {
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
  const smsIncomeThisMonth = smsSentThisMonth * smsRevenuePerMessage;

  const agentHeavyLicenses = filteredLicenses.filter((license) => license.agents > 3).length;
  const inHouseLicenses = filteredLicenses.length - agentHeavyLicenses;

  const highRiskLicenses = filteredLicenses.filter((license) => {
    const lastActiveDate = parseDate(license.lastActive);
    if (!lastActiveDate) return false;
    const diffMs = now.getTime() - lastActiveDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  }).length;

  const averagePayment =
    currentMonthLicenses.length > 0 ? licenseIncomeThisMonth / currentMonthLicenses.length : 0;
  const estimatedNextMonthIncome = licenseIncomeThisMonth + averagePayment * newLicensesThisMonth;

  const cards: StatsCardConfig[] = [
    {
      id: 'total-active-licenses',
      label: 'Total Active Licenses',
      value: formatNumber(totalActiveLicenses),
      icon: Users,
      trend: {
        value: Math.abs(percentageChange(totalActiveLicenses, previousActiveLicenses)),
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
      value: formatNumber(newLicensesThisMonth),
      icon: TrendingUp,
      trend: {
        value: Math.abs(percentageChange(newLicensesThisMonth, newLicensesLastMonth)),
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
      value: formatCurrency(licenseIncomeThisMonth),
      icon: DollarSign,
      trend: {
        value: Math.abs(percentageChange(licenseIncomeThisMonth, licenseIncomeLastMonth)),
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
      value: formatCurrency(smsIncomeThisMonth),
      icon: Phone,
      trend: {
        value: Math.abs(percentageChange(smsSentThisMonth, smsSentLastMonth)),
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
      value: formatNumber(inHouseLicenses),
      icon: Building,
    },
    {
      id: 'total-agent-licenses',
      label: 'Total Agent Licenses',
      value: formatNumber(agentHeavyLicenses),
      icon: User,
    },
    {
      id: 'high-risk-licenses',
      label: 'Total High Risk (7 days no active)',
      value: formatNumber(highRiskLicenses),
      icon: AlertTriangle,
      trend: {
        value: 0,
        direction: 'neutral',
        label: 'auto-updated daily',
      },
    },
    {
      id: 'estimate-next-month',
      label: 'Estimate next month Licenses income',
      value: formatCurrency(estimatedNextMonthIncome),
      icon: TrendingUp,
      trend: {
        value: 10,
        direction: 'up',
        label: 'projected',
      },
    },
  ];

  return cards;
}
