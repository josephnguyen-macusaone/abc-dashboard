'use client';

/**
 * Client-only content for /licenses.
 * Loaded dynamically with ssr: false so the server never loads DashboardTemplate
 * or LicenseManagementPage, avoiding 20–30s render times.
 */
import { DashboardTemplate } from '@/presentation/components/templates';
import { LicenseManagementPage } from './license-management-page';
import { LicenseDashboard } from '@/presentation/components/organisms/license-management/license-dashboard';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { isApiFirstLicenseRole } from '@/shared/constants/license-capabilities';

export function LicensesContent() {
  const userRole = useAuthStore((s) => s.user?.role);
  const useApiFirstView = isApiFirstLicenseRole(userRole);

  return (
    <DashboardTemplate>
      <div className="space-y-8">
        {useApiFirstView ? <LicenseDashboard /> : <LicenseManagementPage />}
      </div>
    </DashboardTemplate>
  );
}
