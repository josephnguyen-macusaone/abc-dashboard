'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/infrastructure/stores/auth-store';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from '@/presentation/components/atoms';
import { ChangePasswordForm } from '@/presentation/components/organisms/form';
import { Key, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/presentation/components/atoms';

export function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const isForced = searchParams.get('forced') === 'true';
  const requiresCurrentPassword = !isForced && !user?.requiresPasswordChange;

  const handleSuccess = () => {
    if (isForced) {
      // Clear forced change flag and redirect to appropriate dashboard
      router.push('/dashboard');
      return;
    }
    router.push('/profile');
  };

  const handleCancel = () => {
    if (isForced) {
      // Can't cancel forced password change
      return;
    }
    router.push('/profile');
  };

  return (
    <DashboardTemplate>
      <div className="space-y-6 flex justify-center">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-title-m">
                  {isForced ? 'Set Your Password' : 'Change Password'}
                </CardTitle>
                <CardDescription>
                  {isForced
                    ? 'Welcome! Please set a new password for your account to continue.'
                    : 'Update your account password to keep your account secure.'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isForced && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Password change is required to access your account. This is your first login or your password has expired.
                </AlertDescription>
              </Alert>
            )}

            <ChangePasswordForm
              requiresCurrentPassword={requiresCurrentPassword}
              isForcedChange={isForced}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardTemplate>
  );
}
