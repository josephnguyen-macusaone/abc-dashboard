'use client';

import { AdminDashboard } from './admin-dashboard';

export function TechDashboard() {
  return (
    <AdminDashboard
      metricsAudience="tech"
      tableTitle="Licenses overview"
      tableDescription="Submit licenses, reset IDs, and adjust coming-expired or activate dates in License Management."
    />
  );
}
