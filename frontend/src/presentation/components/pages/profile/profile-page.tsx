'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Typography } from '@/presentation/components/atoms';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@/presentation/components/atoms/ui';
import { useAuth } from '@/presentation/contexts/auth-context';
import { Mail, Phone, Edit3, Key } from 'lucide-react';
import { Badge } from '@/presentation/components/atoms/ui';

export function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Early return if user data is not available
  if (!user) {
    return (
      <DashboardTemplate>
        <div className="flex items-center justify-center h-64">
          {/* MAC USA ONE Typography: Body M for loading text */}
          <Typography variant="body-m" color="muted">
            Loading profile...
          </Typography>
        </div>
      </DashboardTemplate>
    );
  }

  const userInitials = useMemo(() => {
    if (user.displayName) {
      return user.displayName.slice(0, 2).toUpperCase();
    }

    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }

    if (user.name) {
      const parts = user.name.split(' ');
      if (parts && parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return user.name.slice(0, 2).toUpperCase();
    }

    // Fallback to email initials or generic avatar
    return user.email?.slice(0, 2).toUpperCase() || 'U';
  }, [user]);

  const userRole = user.role || 'user';
  const displayName = user.displayName ||
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
    user.name ||
    'User';

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleChangePassword = () => {
    router.push('/profile/change-password');
  };

  return (
    <DashboardTemplate>
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleEditProfile}
            className="inline-flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-button-s">Edit Profile</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleChangePassword}
            className="inline-flex items-center gap-2"
          >
            <Key className="w-4 h-4" />
            <span className="text-button-s">Change Password</span>
          </Button>
        </div>
        {/* Hero & Profile Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-5" />
          <div className="relative p-8 md:p-12">
            {/* Header Section with Avatar and Basic Info */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* Large Avatar */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-32 h-32 md:w-40 md:h-40">
                  <AvatarImage
                    src={user.avatar}
                    alt={`${displayName}'s avatar`}
                    className="object-cover rounded-2xl"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-4xl md:text-5xl font-bold text-primary-foreground rounded-2xl">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* User Info & Actions */}
              <div className="flex-1 space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* MAC USA ONE Typography: Title XL for user name */}
                    <Typography variant="title-l" className="font-bold text-foreground">
                      {displayName}
                    </Typography>
                    <Badge variant="secondary" className="text-xs w-fit ">
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </Badge>
                  </div>
                  {user.bio && (
                    <Typography variant="body-s" color="muted" className="max-w-2xl">
                      {user.bio}
                    </Typography>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-4 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      {/* MAC USA ONE Typography: Body M for contact info */}
                      <Typography variant="body-s" className="text-foreground pb-1">
                        {user.email || 'demo@example.com'}
                      </Typography>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Typography variant="body-s" className="text-foreground pb-1">
                        {user.phone || 'Not set'}
                      </Typography>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardTemplate>
  );
}
