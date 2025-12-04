'use client';

import { LicenseMetricsSection } from "./sections";
import { LicenseTableSection } from "./sections/license-table-section";

interface AdminDashboardProps {
  className?: string;
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  return (
    <div className={`space-y-6 ${className || ''}`}>
      <LicenseMetricsSection />
      <LicenseTableSection />
    </div>
  );
}
