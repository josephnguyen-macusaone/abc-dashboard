'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/auth-context';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Badge } from '@/presentation/components/atoms/ui/badge';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Users, UserPlus, DollarSign, MessageSquare, Home, Building2, AlertTriangle, TrendingUp, Calendar, FileText, CreditCard, Activity, Mail, Wallet, UserCircle, Shield, Settings, UserCheck } from 'lucide-react';
import { PermissionUtils, USER_ROLES } from '@/shared/constants';
import { CanCreateUser, AdminOnly, ManagerOrHigher } from '@/presentation/components/atoms';
import { UserManagementPage } from '@/presentation/components/pages/user-management-page';

interface DashboardPageProps {
  role?: string;
  showRoleSpecificContent?: boolean;
}

export function DashboardPage({ role, showRoleSpecificContent = false }: DashboardPageProps = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Get section from URL query params
  useEffect(() => {
    const section = searchParams.get('section') || 'overview';
    setActiveSection(section);
  }, [searchParams]);

  // If this is the general dashboard and we have a user with a role, redirect to role-specific dashboard
  useEffect(() => {
    if (!role && user?.role && ['admin', 'manager', 'staff'].includes(user.role)) {
      console.log('Redirecting to role-specific dashboard:', `/dashboard/${user.role}`);
      router.replace(`/dashboard/${user.role}`);
    }
  }, [user, role, router]);

  // Render section-specific content
  const renderSectionContent = () => {
    const config = role ? roleConfigs[role as keyof typeof roleConfigs] : null;

    switch (activeSection) {
      case 'users':
        return PermissionUtils.canReadUser(user?.role) ? (
          <UserManagementPage />
        ) : null;

      case 'settings':
        return PermissionUtils.canManageSystem(user?.role) ? (
          <AdminOnly>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Settings
                  </CardTitle>
                  <CardDescription>
                    Configure system-wide settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    System settings panel will be implemented here.
                  </div>
                </CardContent>
              </Card>
            </div>
          </AdminOnly>
        ) : null;

      case 'team':
        return PermissionUtils.isManager(user?.role) ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Management
                </CardTitle>
                <CardDescription>
                  Manage your team members and permissions (cannot modify admins or other managers)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Team management functionality will be implemented here.
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null;

      case 'tasks':
        return PermissionUtils.isStaff(user?.role) ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  My Tasks
                </CardTitle>
                <CardDescription>
                  View and manage your assigned tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Task management functionality will be implemented here.
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null;

      default:
        // Show default overview content with role-specific features
        return config ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {config.features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <IconComponent className="h-5 w-5" />
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to your Dashboard</CardTitle>
                <CardDescription>
                  Your personalized dashboard is loading...
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        );
    }
  };

  // Role configurations for role-specific content
  const roleConfigs = {
    admin: {
      title: 'Admin Dashboard',
      description: 'Full system administration and management',
      icon: Shield,
      color: 'destructive' as const,
      features: [
        { title: 'User Management', description: 'Manage all system users', icon: Users },
        { title: 'System Settings', description: 'Configure system-wide settings', icon: Activity },
        { title: 'Analytics', description: 'View system analytics and reports', icon: TrendingUp },
        { title: 'Security Logs', description: 'Monitor security events', icon: FileText },
      ]
    },
    manager: {
      title: 'Manager Dashboard',
      description: 'Team management and oversight',
      icon: Users,
      color: 'secondary' as const,
      features: [
        { title: 'Team Management', description: 'Manage your team members', icon: Users },
        { title: 'Reports', description: 'View team performance reports', icon: FileText },
        { title: 'Settings', description: 'Team-specific settings', icon: Activity },
      ]
    },
    staff: {
      title: 'Staff Dashboard',
      description: 'Your personal workspace and tasks',
      icon: UserCircle,
      color: 'default' as const,
      features: [
        { title: 'My Tasks', description: 'View and manage your tasks', icon: FileText },
        { title: 'Profile', description: 'Manage your profile settings', icon: UserCircle },
      ]
    }
  };

  const config = role ? roleConfigs[role as keyof typeof roleConfigs] : null;

  return (
    <DashboardTemplate>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard` : 'Dashboard'}
            {activeSection !== 'overview' && ` - ${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}`}
          </h1>
          <p className="text-muted-foreground">
            {role
              ? `${config?.description || 'Manage your role-specific features and access.'}`
              : `Welcome back, ${user?.displayName || user?.name || 'User'}! Here's what's happening with your account.`
            }
          </p>
        </div>

        {/* Section Content */}
        {renderSectionContent()}
      </div>
    </DashboardTemplate>
  );
}
