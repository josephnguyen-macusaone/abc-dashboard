'use client';

import { useRouter } from 'next/navigation';
import { DashboardTemplate } from '@/presentation/components/templates/dashboard-template';
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from '@/presentation/components/atoms';
import { ChangePasswordForm } from '@/presentation/components/organisms/form';
import { Key } from 'lucide-react';

export function ChangePasswordPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/profile');
  };

  const handleCancel = () => {
    router.push('/profile');
  };

  return (
    <DashboardTemplate>
      <div className="space-y-6 flex justify-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password to keep your account secure.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <ChangePasswordForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardTemplate>
  );
}