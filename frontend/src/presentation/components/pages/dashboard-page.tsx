'use client';

import { useAuth } from '@/presentation/contexts/auth-context';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Badge } from '@/presentation/components/atoms/ui/badge';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Users, UserPlus, DollarSign, MessageSquare, Home, Building2, AlertTriangle, TrendingUp, Calendar, FileText, CreditCard, Activity, Mail, Wallet, UserCircle, Shield } from 'lucide-react';

interface DashboardPageProps {
  role?: string;
  showRoleSpecificContent?: boolean;
}

export function DashboardPage({ role, showRoleSpecificContent = false }: DashboardPageProps = {}) {
  const { user } = useAuth();

  // Role configurations for role-specific content
  const roleConfigs = {
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
      description: 'Team management and oversight',
      icon: Users,
      color: 'secondary' as const,
      features: [
        { title: 'Team Management', description: 'Manage your team members', icon: Users },
        { title: 'Reports', description: 'View team performance reports', icon: FileText },
        { title: 'Settings', description: 'Team-specific settings', icon: Activity },
      ]
    },
    staff: {
      title: 'Staff Dashboard',
      description: 'Your personal workspace and tasks',
      icon: UserCircle,
      color: 'default' as const,
      features: [
        { title: 'My Tasks', description: 'View and manage your tasks', icon: FileText },
        { title: 'Profile', description: 'Manage your profile settings', icon: UserCircle },
      ]
    }
  };

  const config = role ? roleConfigs[role as keyof typeof roleConfigs] : null;

  return (
    <DashboardTemplate>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard` : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {role
              ? `${config?.description || 'Manage your role-specific features and access.'}`
              : `Welcome back, ${user?.name || 'User'}! Here's what's happening with your account.`
            }
          </p>
        </div>
      </div>
    </DashboardTemplate>
  );
}
