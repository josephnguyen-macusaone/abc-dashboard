'use client';

import { AdminDashboard } from './admin-dashboard';

export function AgentDashboard() {
  return (
    <AdminDashboard
      metricsAudience="agent"
      tableTitle="My licenses"
      tableDescription="Licenses linked to your agent account (read-only)"
      skipDefaultDateRange
    />
  );
}
