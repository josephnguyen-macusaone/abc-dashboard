'use client';

import { useAuth } from '@/presentation/contexts/auth-context';
import { DashboardTemplate } from '@/presentation/components/templates';
import { AdminDashboard, StaffDashboard } from '@/presentation/components/organisms';
import { USER_ROLES } from '@/shared/constants';

export function DashboardPage() {
  const { user } = useAuth();

  // Check if user is admin or manager
  const isAdminOrManager = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.MANAGER;
  const isStaff = user?.role === USER_ROLES.STAFF;

  // Render dashboard content based on user role
  const renderContent = () => {
    if (isAdminOrManager) {
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
