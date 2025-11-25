'use client';

import { useMemo, useState } from 'react';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Typography } from '@/presentation/components/atoms';
import { ProfileUpdateForm, ChangePasswordForm } from '@/presentation/components/organisms/form';
import { useAuth } from '@/presentation/contexts/auth-context';
import { Mail, Shield, User, CheckCircle2, Building2, Activity, Edit3, Key, Phone, MessageSquare, UserCheck } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Badge } from '@/presentation/components/atoms/ui';

interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}

function InfoCard({ icon: Icon, label, value, className }: InfoCardProps) {
  return (
    <div className={cn(
      'group relative overflow-hidden rounded-xl border border-border bg-card p-6',
      'transition-all duration-200 hover:shadow-lg hover:border-primary/20',
      'hover:-translate-y-0.5',
      className
    )}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="p" size="xs" weight="medium" className="text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </Typography>
          <Typography variant="p" size="base" weight="semibold" className="text-foreground truncate">
            {value}
          </Typography>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const userInitials = useMemo(() => {
    if (user?.displayName) {
      return user.displayName.slice(0, 2).toUpperCase();
    }

    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }

    if (user?.name) {
      const parts = user.name.split(' ');
      if (parts && parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }

    // Fallback to email initials or generic avatar
    return user?.email?.slice(0, 2).toUpperCase() || 'U';
  }, [user]);

  const userRole = user?.role || 'user';
  const displayName = user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'User';

  const handleEditSuccess = () => {
    setActiveTab('profile');
  };

  return (
    <DashboardTemplate>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-5" />
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
              {/* Large Avatar */}
              <div className="relative">
                <div className="relative">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${displayName}'s avatar`}
                      className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-xl ring-4 ring-background object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl flex items-center justify-center text-4xl md:text-5xl font-bold text-primary-foreground ring-4 ring-background">
                      {userInitials}
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Typography variant="h1" size="2xl" weight="bold" className="text-foreground">
                      {displayName}
                    </Typography>
                    <Badge variant="secondary" className="text-xs">
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                  </div>
                  {user?.bio && (
                    <Typography variant="p" size="base" className="text-muted-foreground">
                      {user.bio}
                    </Typography>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <User className="w-4 h-4" />
            View Profile
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'edit'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'password'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Key className="w-4 h-4" />
            Change Password
          </button>
        </div>

        {/* Profile Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoCard
                icon={Mail}
                label="Email Address"
                value={user?.email || 'demo@example.com'}
              />

              <InfoCard
                icon={User}
                label="Full Name"
                value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Not set'}
              />

              {user?.displayName && (
                <InfoCard
                  icon={UserCheck}
                  label="Display Name"
                  value={user.displayName}
                />
              )}

              <InfoCard
                icon={Phone}
                label="Phone Number"
                value={user?.phone || 'Not set'}
              />

              <InfoCard
                icon={Shield}
                label="Account Role"
                value={userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              />

              <InfoCard
                icon={Activity}
                label="Account Status"
                value={user?.isActive ? 'Active' : 'Inactive'}
              />
            </div>

            {user?.bio && (
              <div className="space-y-3">
                <Typography variant="h3" size="lg" weight="semibold">
                  Bio
                </Typography>
                <div className={cn(
                  'p-6 rounded-xl border border-border bg-card',
                  'prose prose-sm max-w-none'
                )}>
                  <Typography variant="p" size="base" className="text-muted-foreground">
                    {user.bio}
                  </Typography>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && (
          <ProfileUpdateForm
            onSuccess={handleEditSuccess}
            onCancel={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'password' && (
          <ChangePasswordForm
            onSuccess={handleEditSuccess}
            onCancel={() => setActiveTab('profile')}
          />
        )}
      </div>
    </DashboardTemplate>
  );
}
