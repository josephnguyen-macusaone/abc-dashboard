'use client';

import { useAuthStore } from '@/infrastructure/stores/auth';
import { DashboardTemplate } from '@/presentation/components/templates';
import { AdminDashboard, StaffDashboard } from '@/presentation/components/organisms';
import { USER_ROLES } from '@/shared/constants';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  // Roles that should use the full admin-style dashboard experience
  const isAdminDashboardRole =
    user?.role === USER_ROLES.ADMIN ||
    user?.role === USER_ROLES.MANAGER ||
    user?.role === USER_ROLES.ACCOUNTANT ||
    user?.role === USER_ROLES.TECH ||
    user?.role === USER_ROLES.AGENT;
  const isStaff = user?.role === USER_ROLES.STAFF;

  // Render dashboard content based on user role
  const renderContent = () => {
    if (isAdminDashboardRole) {
      return <AdminDashboard />;
    }

    if (isStaff) {
      return <StaffDashboard />;
    }

    return null;
  };

  return (
    <DashboardTemplate>
      <div className="space-y-8">
        {renderContent()}
      </div>
    </DashboardTemplate>
  );
}
