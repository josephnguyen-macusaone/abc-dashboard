'use client';

/**
 * Client-only content for /users.
 * Loaded dynamically with ssr: false so the server never loads DashboardTemplate
 * or UserManagementPage, avoiding 20–30s render times.
 */
import { DashboardTemplate } from '@/presentation/components/templates';
import { UserManagementPage } from './user-management-page';

export function UsersContent() {
  return (
    <DashboardTemplate>
      <div className="space-y-8">
        <UserManagementPage />
      </div>
    </DashboardTemplate>
  );
}
