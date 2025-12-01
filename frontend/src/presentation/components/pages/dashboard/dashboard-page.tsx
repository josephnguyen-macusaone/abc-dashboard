'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/auth-context';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Settings, FileText } from 'lucide-react';
import { PermissionUtils, getDashboardRoleConfig } from '@/shared/constants';
import { AdminOnly } from '@/presentation/components/atoms';
import { UserManagementPage } from './user-management-page';
import { Typography } from '@/presentation/components/atoms';

interface DashboardPageProps {}

export function DashboardPage({}: DashboardPageProps = {}) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Get section from URL query params
  useEffect(() => {
    const section = searchParams.get('section') || 'overview';
    setActiveSection(section);
  }, [searchParams, user]);


  // Render section-specific content
  const renderSectionContent = () => {
    const config = getDashboardRoleConfig(user?.role);

    switch (activeSection) {
      case 'users':
        return PermissionUtils.canReadUser(user?.role) ? (
          <UserManagementPage />
        ) : (
          <div className="text-center py-8">
            <p>You don't have permission to access user management.</p>
            <p>Your role: {user?.role || 'none'}</p>
          </div>
        );

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
                  {/* MAC USA ONE Typography: Body S for placeholder text */}
                  <Typography variant="body-s" color="muted">
                    System settings panel will be implemented here.
                  </Typography>
                </CardContent>
              </Card>
            </div>
          </AdminOnly>
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
                <Typography variant="body-s" color="muted">
                  Task management functionality will be implemented here.
                </Typography>
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
                    <CardTitle className="flex items-center gap-2 text-title-m">
                      <IconComponent className="h-5 w-5" />
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-body-s">
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

  return (
    <DashboardTemplate>
      <div className="space-y-8">
        {renderSectionContent()}
      </div>
    </DashboardTemplate>
  );
}
