'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/auth-context';
import { DashboardTemplate } from '@/presentation/components/templates';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { DateRangePicker } from '@/presentation/components/atoms/ui/date-range-picker';
import { StatsCards } from '@/presentation/components/molecules/user-management';
import { UserManagementPage } from './user-management-page';
import {
  DollarSign,
  Phone,
  AlertTriangle,
  Building,
  User,
  TrendingUp,
  Users
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface DashboardPageProps { }

export function DashboardPage({ }: DashboardPageProps = {}) {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Get current section from URL
  const currentSection = searchParams.get('section');

  // Date range state for license metrics (only used by admin/manager)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  // Check if user is admin or manager
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isStaff = user?.role === 'staff';

  // Render different sections based on URL parameter
  const renderContent = () => {
    switch (currentSection) {
      case 'users':
        // User Management section
        if (isAdminOrManager) {
          return <UserManagementPage />;
        }
        // If staff tries to access users section, show access denied
        return (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to access user management.
              </CardDescription>
            </CardHeader>
          </Card>
        );

      case 'profile':
        // Profile section (could be expanded later)
        return (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Profile Management</CardTitle>
              <CardDescription>
                Profile management features will be available here.
              </CardDescription>
            </CardHeader>
          </Card>
        );

      default:
        // Default dashboard view
        if (isAdminOrManager) {
          return (
            <>
              {/* Date Range Filter */}
              <Card>
                <CardHeader>
                  <CardTitle>Date Range Filter</CardTitle>
                  <CardDescription>
                    Select a date range to filter license metrics
                  </CardDescription>
                  <CardAction className="self-center">
                    <DateRangePicker
                      date={dateRange}
                      onDateChange={setDateRange}
                      placeholder="Select date range"
                    />
                  </CardAction>
                </CardHeader>
              </Card>

              {/* License Metrics */}
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
            </>
          );
        }

        if (isStaff) {
          return (
            <div className="space-y-6">
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-2xl">Welcome to Your Dashboard</CardTitle>
                  <CardDescription>
                    Hello {user?.firstName || user?.displayName || 'there'}!
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          );
        }

        return null;
    }
  };

  return (
    <DashboardTemplate>
      <div className="space-y-8">
        {renderContent()}
      </div>
    </DashboardTemplate>
  );
}
