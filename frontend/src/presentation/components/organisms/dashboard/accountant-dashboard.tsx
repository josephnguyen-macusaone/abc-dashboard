'use client';

import { AdminDashboard } from './admin-dashboard';

export function AccountantDashboard() {
  return (
    <AdminDashboard
      metricsAudience="accountant"
      tableTitle="Licenses overview"
      tableDescription="View licenses, packages, activation, SMS balance, and payments. Full edits live in License Management."
    />
  );
}
