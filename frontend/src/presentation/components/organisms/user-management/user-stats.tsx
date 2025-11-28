'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserManagementService } from '@/presentation/hooks/use-user-management-service';
import type { UserStats } from '@/application/dto/user-dto';
import { USER_ROLE_LABELS } from '@/shared/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { Skeleton } from '@/presentation/components/atoms/ui/skeleton';
import { Badge } from '@/presentation/components/atoms/ui/badge';
import { Typography } from '@/presentation/components/atoms';

import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Users2,
  TrendingUp,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface UserStatsProps {
  refreshTrigger?: number;
}

export function UserStats({ refreshTrigger }: UserStatsProps) {
  const userManagementService = useUserManagementService();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const statsData = await userManagementService.getUserStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user statistics');
      console.error('Error loading user stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userManagementService]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-1" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>No statistics available.</AlertDescription>
      </Alert>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      description: 'All registered users',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      description: `${Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}% of total`,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Inactive Users',
      value: stats.inactiveUsers,
      description: `${Math.round((stats.inactiveUsers / stats.totalUsers) * 100) || 0}% of total`,
      icon: UserX,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Recent Users',
      value: stats.recentUsers,
      description: 'Joined this month',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {/* MAC USA ONE Typography: Title S for stat card titles */}
                <CardTitle className="text-title-s">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {/* MAC USA ONE Typography: Title L for stat values */}
                <Typography variant="title-l" className="font-bold">
                  {stat.value.toLocaleString()}
                </Typography>
                {/* MAC USA ONE Typography: Caption for descriptions */}
                <Typography variant="caption" color="muted" className="mt-1">
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Role Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of users by role and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.usersByRole).map(([role, count]) => {
              const percentage = Math.round((count / stats.totalUsers) * 100) || 0;
              const roleLabel = USER_ROLE_LABELS[role as keyof typeof USER_ROLE_LABELS] || role;

              return (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        role === 'admin' ? 'destructive' :
                        role === 'manager' ? 'secondary' : 'default'
                      }
                      className="capitalize"
                    >
                      {roleLabel}
                    </Badge>
                    {/* MAC USA ONE Typography: Body S for user count */}
                    <Typography variant="body-s" color="muted" as="span">
                      {count} user{count !== 1 ? 's' : ''}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          role === 'admin' ? 'bg-red-500' :
                          role === 'manager' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {/* MAC USA ONE Typography: Body S for percentage */}
                    <Typography variant="body-s" className="font-medium w-12 text-right" as="span">
                      {percentage}%
                    </Typography>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              {/* MAC USA ONE Typography: Body S for labels */}
              <Typography variant="body-s" as="span">Active Accounts</Typography>
              <Badge variant="default" className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {stats.activeUsers}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <Typography variant="body-s" as="span">Inactive Accounts</Typography>
              <Badge variant="secondary" className="flex items-center gap-1">
                <UserX className="h-3 w-3" />
                {stats.inactiveUsers}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <Typography variant="body-s" as="span">Activation Rate</Typography>
              <Typography variant="body-s" className="font-medium" as="span">
                {Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}%
              </Typography>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Role Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <Typography variant="body-s" as="span">Administrators</Typography>
              <Badge variant="destructive" className="text-xs">
                {stats.usersByRole.admin}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <Typography variant="body-s" as="span">Managers</Typography>
              <Badge variant="secondary" className="text-xs">
                {stats.usersByRole.manager}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <Typography variant="body-s" as="span">Staff Members</Typography>
              <Badge variant="default" className="text-xs">
                {stats.usersByRole.staff}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
