'use client';

/**
 * Client-only content for /licenses.
 * Loaded dynamically with ssr: false so the server never loads DashboardTemplate
 * or LicenseManagementPage, avoiding 20–30s render times.
 */
import { DashboardTemplate } from '@/presentation/components/templates';
import { LicenseManagementPage } from './license-management-page';

export function LicensesContent() {
  return (
    <DashboardTemplate>
      <div className="space-y-8">
        <LicenseManagementPage />
      </div>
    </DashboardTemplate>
  );
}
