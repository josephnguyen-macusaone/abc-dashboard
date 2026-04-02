'use client';

import { AdminDashboard } from './admin-dashboard';
import { DashboardRoleIntro } from './dashboard-role-intro';

export function TechDashboard() {
  return (
    <div className="space-y-6">
      <DashboardRoleIntro
        title="Tech dashboard"
        description="Overview of licenses and metrics. Submit new licenses, reset license IDs, and adjust coming-expired or activate dates from License Management."
      />
      <AdminDashboard
        tableTitle="Licenses overview"
        tableDescription="Use License Management for technical edits and submissions"
      />
    </div>
  );
}
