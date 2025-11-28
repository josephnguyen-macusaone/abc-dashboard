'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { ProtectedRoute } from '@/presentation/components/routes/protected-route';
import { DashboardPage } from '@/presentation/components/pages';

interface RoleDashboardClientProps {
  role: string;
}

export function RoleDashboardClient({ role }: RoleDashboardClientProps) {
  // Validate role on client side as well (for dynamic navigation)
  useEffect(() => {
    if (role && !['admin', 'manager', 'staff'].includes(role)) {
      redirect('/dashboard');
    }
  }, [role]);

  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardPage role={role} showRoleSpecificContent={true} />
    </ProtectedRoute>
  );
}
