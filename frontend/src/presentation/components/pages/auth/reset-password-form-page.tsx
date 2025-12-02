'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Typography } from '@/presentation/components/atoms';
import { AuthTemplate } from '@/presentation/components/templates';
import { ResetPasswordForm } from '@/presentation/components/organisms/form';
import { ArrowLeft } from 'lucide-react';

export function ResetPasswordFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleSuccess = () => {
    // Form handles success state internally, redirect after a delay
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md space-y-8">
        <AuthTemplate>
          <ResetPasswordForm
            token={token || undefined}
            onSuccess={handleSuccess}
          />

          {/* Back to Login */}
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackToLogin}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </AuthTemplate>
      </div>
    </div>
  );
}
