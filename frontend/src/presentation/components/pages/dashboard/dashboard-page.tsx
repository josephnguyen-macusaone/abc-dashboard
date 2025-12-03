'use client';

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/auth-context';
import { DashboardTemplate } from '@/presentation/components/templates';
import { AccessDeniedCard } from '@/presentation/components/molecules/ui';
import { AdminDashboard, StaffDashboard } from '@/presentation/components/organisms';
import { UserManagementPage } from './user-management-page';
import { USER_ROLES } from '@/shared/constants';

interface DashboardPageProps { }

export function DashboardPage({ }: DashboardPageProps = {}) {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Get current section from URL
  const currentSection = searchParams.get('section');

  // Check if user is admin or manager
  const isAdminOrManager = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.MANAGER;
  const isStaff = user?.role === USER_ROLES.STAFF;

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
          <AccessDeniedCard
            title="Access Denied"
            message="You don't have permission to access user management."
          />
        );

      default:
        // Default dashboard view
        if (isAdminOrManager) {
          return <AdminDashboard />;
        }

        if (isStaff) {
          return <StaffDashboard />;
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
