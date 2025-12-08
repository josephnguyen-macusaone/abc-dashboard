'use client';

import { useState } from 'react';
import { StatsCards } from '@/presentation/components/molecules/domain/user-management';
import { DateRangeFilterCard } from '@/presentation/components/molecules/domain/dashboard';
import type { DateRange } from '@/presentation/components/atoms/forms/date-range-picker';
import {
  DollarSign,
  Phone,
  AlertTriangle,
  Building,
  User,
  TrendingUp,
  Users
} from 'lucide-react';

export function LicenseMetricsSection() {
  // Date range state for license metrics
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const handleDateUpdate = (values: { range: DateRange; rangeCompare?: DateRange }) => {
    setDateRange(values.range);
  };

  return (
    <div className="space-y-6">
      <DateRangeFilterCard
        initialDateFrom={dateRange.from}
        initialDateTo={dateRange.to}
        onUpdate={handleDateUpdate}
        showCompare={false}
      />
      <StatsCards
        stats={[
          {
            id: 'total-active-licenses',
            label: 'Total Active Licenses',
            value: '1,541',
            icon: Users,
            trend: {
              value: 8.2,
              direction: 'up',
              label: 'from last month'
            }
          },
          {
            id: 'new-licenses-month',
            label: 'New Licenses this month',
            value: '90',
            icon: TrendingUp,
            trend: {
              value: 15.3,
              direction: 'up',
              label: 'from last month'
            }
          },
          {
            id: 'licenses-income-month',
            label: 'Total Licenses income this month',
            value: '$40,430',
            icon: DollarSign,
            trend: {
              value: 12.8,
              direction: 'up',
              label: 'from last month'
            }
          },
          {
            id: 'sms-income-month',
            label: 'Total SMS income this month',
            value: '$20,000',
            icon: Phone,
            trend: {
              value: -2.1,
              direction: 'down',
              label: 'from last month'
            }
          },
          {
            id: 'total-inhouse-licenses',
            label: 'Total In-house Licenses',
            value: '1,593',
            icon: Building,
            trend: {
              value: 6.7,
              direction: 'up',
              label: 'from last quarter'
            }
          },
          {
            id: 'total-agent-licenses',
            label: 'Total Agent Licenses',
            value: '51',
            icon: User,
            trend: {
              value: -5.2,
              direction: 'down',
              label: 'from last month'
            }
          },
          {
            id: 'high-risk-licenses',
            label: 'Total High Risk (7 days no active)',
            value: '30',
            icon: AlertTriangle,
            trend: {
              value: -18.5,
              direction: 'down',
              label: 'improvement'
            }
          },
          {
            id: 'estimate-next-month',
            label: 'Estimate next month Licenses income',
            value: '$50,000',
            icon: TrendingUp,
            trend: {
              value: 23.8,
              direction: 'up',
              label: 'projected growth'
            }
          }
        ]}
        columns={4}
      />
    </div>
  );
}
