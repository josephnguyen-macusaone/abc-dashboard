'use client';

import { useAuthStore } from '@/infrastructure/stores/auth';
import { DashboardTemplate } from '@/presentation/components/templates';
import {
  AdminDashboard,
  AgentDashboard,
  TechDashboard,
  AccountantDashboard,
} from '@/presentation/components/organisms';
import { USER_ROLES } from '@/shared/constants';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const renderContent = () => {
    switch (role) {
      case USER_ROLES.AGENT:
        return <AgentDashboard />;
      case USER_ROLES.TECH:
        return <TechDashboard />;
      case USER_ROLES.ACCOUNTANT:
        return <AccountantDashboard />;
      case USER_ROLES.ADMIN:
      case USER_ROLES.MANAGER:
        return <AdminDashboard />;
      default:
        return null;
    }
  };

  return (
    <DashboardTemplate>
      <div className="space-y-8">{renderContent()}</div>
    </DashboardTemplate>
  );
}
