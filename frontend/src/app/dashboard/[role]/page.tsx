import { RoleDashboardClient } from './client';

// Generate static params for all possible roles
export async function generateStaticParams() {
  return [
    { role: 'admin' },
    { role: 'manager' },
    { role: 'staff' },
  ];
}

interface RoleDashboardProps {
  params: Promise<{
    role: string;
  }>;
}

export default async function RoleDashboard({ params }: RoleDashboardProps) {
      const resolvedParams = await params;
  const role = resolvedParams.role;

  // Validate role at build time
  if (!['admin', 'manager', 'staff'].includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  return <RoleDashboardClient role={role} />;
}
