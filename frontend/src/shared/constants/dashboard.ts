/**
 * Dashboard Role Configurations
 * Centralized role-based dashboard content and features
 */

// Icon imports for dashboard configurations
import { Users, UserCircle, Shield, Activity, TrendingUp, FileText, UserCheck } from 'lucide-react';

export interface DashboardRoleConfig {
  title: string;
  description: string;
  icon: any; // Lucide icon component
  color: 'default' | 'secondary' | 'destructive' | 'outline';
  features: Array<{
    title: string;
    description: string;
    icon: any; // Lucide icon component
  }>;
}

export const DASHBOARD_ROLE_CONFIGS: Record<string, DashboardRoleConfig> = {
  admin: {
    title: 'Admin Dashboard',
    description: 'Full system administration and management',
    icon: Shield,
    color: 'destructive' as const,
    features: [
      { title: 'User Management', description: 'Manage all system users', icon: Users },
      { title: 'System Settings', description: 'Configure system-wide settings', icon: Activity },
      { title: 'Analytics', description: 'View system analytics and reports', icon: TrendingUp },
      { title: 'Security Logs', description: 'Monitor security events', icon: FileText },
    ]
  },
  manager: {
    title: 'Manager Dashboard',
    description: 'User management and oversight',
    icon: Users,
    color: 'secondary' as const,
    features: [
      { title: 'User Management', description: 'Manage staff accounts and permissions', icon: Users },
      { title: 'Reports', description: 'View team performance reports', icon: FileText },
      { title: 'User Approvals', description: 'Handle user approval workflows', icon: UserCheck },
      { title: 'Analytics', description: 'View management analytics', icon: TrendingUp },
    ]
  },
  staff: {
    title: 'Staff Dashboard',
    description: 'Your personal workspace and tasks',
    icon: UserCircle,
    color: 'default' as const,
    features: [
      { title: 'My Tasks', description: 'View and manage your tasks', icon: FileText },
    ]
  }
};

/**
 * Get dashboard role configuration for a given role
 */
export const getDashboardRoleConfig = (role?: string): DashboardRoleConfig | null => {
  return role ? DASHBOARD_ROLE_CONFIGS[role] || null : null;
};