'use client';

import { useState, useEffect } from 'react';
import { userApi } from '@/infrastructure/api/users';
import { UserStatsResponse } from '@/infrastructure/api/types';
import { USER_ROLE_LABELS } from '@/shared/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { Skeleton } from '@/presentation/components/atoms/ui/skeleton';
import { Badge } from '@/presentation/components/atoms/ui/badge';

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
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userApi.getUserStats();
      setStats(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user statistics');
      console.error('Error loading user stats:', err);
    } finally {
      setLoading(false);
    }
  };

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
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
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
                    <span className="text-sm text-muted-foreground">
                      {count} user{count !== 1 ? 's' : ''}
                    </span>
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
                    <span className="text-sm font-medium w-12 text-right">
                      {percentage}%
                    </span>
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
              <span className="text-sm">Active Accounts</span>
              <Badge variant="default" className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {stats.activeUsers}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Inactive Accounts</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <UserX className="h-3 w-3" />
                {stats.inactiveUsers}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Activation Rate</span>
              <span className="text-sm font-medium">
                {Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}%
              </span>
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
              <span className="text-sm">Administrators</span>
              <Badge variant="destructive" className="text-xs">
                {stats.usersByRole.admin}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Managers</span>
              <Badge variant="secondary" className="text-xs">
                {stats.usersByRole.manager}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Staff Members</span>
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
