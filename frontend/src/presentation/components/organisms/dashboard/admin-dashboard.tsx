'use client';

import { LicenseMetricsSection } from "./sections";

interface AdminDashboardProps {
  className?: string;
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  return (
    <div className={`space-y-6 ${className || ''}`}>
      <LicenseMetricsSection />
    </div>
  );
}
