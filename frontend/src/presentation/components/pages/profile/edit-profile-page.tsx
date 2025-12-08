'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/presentation/components/atoms';
import { ProfileUpdateForm } from '@/presentation/components/organisms/user/profile-update-form';
import { useAuth } from '@/presentation/contexts/auth-context';
import { User } from 'lucide-react';
import { Typography } from '@/presentation/components/atoms';

interface ParsedProfileData {
  displayName: string;
  bio: string;
  phone: string;
}

export function EditProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [parsedProfileData, setParsedProfileData] = useState<ParsedProfileData | null>(null);

  useEffect(() => {
    if (user && !parsedProfileData) {
      setParsedProfileData({
        displayName: user.displayName ?? '',
        bio: user.bio ?? '',
        phone: user.phone ?? '',
      });
    }
  }, [user, parsedProfileData]);

  if (authLoading || !user) {
    return (
      <DashboardTemplate>
        <div className="space-y-6 flex justify-center">
          <Card className="w-full max-w-4xl">
            <CardContent className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                {/* MAC USA ONE Typography: Body S for loading text */}
                <Typography variant="body-s" color="muted">
                  {authLoading ? 'Initializing authentication...' : 'Loading user data...'}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardTemplate>
    );
  }

  const handleSuccess = () => {
    router.push('/profile');
  };

  const handleCancel = () => {
    router.push('/profile');
  };

  return (
    <DashboardTemplate>
      <div className="space-y-6 flex justify-center items-center">
        <Card className="w-full max-w">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                {/* MAC USA ONE Typography: Title M for page title */}
                <CardTitle className="text-title-m">
                  Edit Profile
                </CardTitle>
                <CardDescription>
                  Update your profile information and personal details.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {parsedProfileData && (
              <ProfileUpdateForm
                initialData={parsedProfileData}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardTemplate>
  );
}
