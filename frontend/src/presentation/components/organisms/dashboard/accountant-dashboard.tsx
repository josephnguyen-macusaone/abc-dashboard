'use client';

import { AdminDashboard } from './admin-dashboard';
import { DashboardRoleIntro } from './dashboard-role-intro';

export function AccountantDashboard() {
  return (
    <div className="space-y-6">
      <DashboardRoleIntro
        title="Accountant dashboard"
        description="Financial and operational overview. Manage licenses, packages, activation, SMS balance, and payments from License Management."
      />
      <AdminDashboard
        tableTitle="Licenses overview"
        tableDescription="Full license operations are available in License Management"
      />
    </div>
  );
}
