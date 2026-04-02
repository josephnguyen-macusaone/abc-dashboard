'use client';

import { DashboardTemplate } from '@/presentation/components/templates';
import {
  AdminDashboard,
  AgentDashboard,
  TechDashboard,
  AccountantDashboard,
} from '@/presentation/components/organisms';

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardTemplate>
      <div className="space-y-8">{children}</div>
    </DashboardTemplate>
  );
}

export function AdminRoleDashboardPage() {
  return (
    <DashboardShell>
      <AdminDashboard />
    </DashboardShell>
  );
}

export function AgentRoleDashboardPage() {
  return (
    <DashboardShell>
      <AgentDashboard />
    </DashboardShell>
  );
}

export function TechRoleDashboardPage() {
  return (
    <DashboardShell>
      <TechDashboard />
    </DashboardShell>
  );
}

export function AccountantRoleDashboardPage() {
  return (
    <DashboardShell>
      <AccountantDashboard />
    </DashboardShell>
  );
}
