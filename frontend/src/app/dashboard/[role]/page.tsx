'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { ProtectedRoute } from '@/presentation/components/routes/protected-route';
import { DashboardPage } from '@/presentation/components/pages/dashboard-page';
import { LoadingOverlay } from '@/presentation/components/atoms';

interface RoleDashboardProps {
  params: Promise<{
    role: string;
  }>;
}

function RoleDashboardContent({ role }: { role: string }) {
  return <DashboardPage role={role} showRoleSpecificContent={true} />;
}

export default function RoleDashboard({ params }: RoleDashboardProps) {
  const [role, setRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setRole(resolvedParams.role);
      setIsLoading(false);
    };

    getParams();
  }, [params]);

  // Redirect if role is not valid
  useEffect(() => {
    if (!isLoading && role && !['admin', 'manager', 'staff'].includes(role)) {
      redirect('/dashboard');
    }
  }, [role, isLoading]);

  if (isLoading || !role) {
    return <LoadingOverlay text="Loading..." />;
  }

  return (
    <ProtectedRoute requireAuth={true}>
      <RoleDashboardContent role={role} />
    </ProtectedRoute>
  );
}

// Note: generateStaticParams is not available in client components
// This page will be dynamically rendered
