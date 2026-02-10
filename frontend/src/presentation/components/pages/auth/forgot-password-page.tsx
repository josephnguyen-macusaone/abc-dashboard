'use client';

import { useRouter } from 'next/navigation';
import { AuthTemplate } from '@/presentation/components/templates';
import { ForgotPasswordForm } from '@/presentation/components/organisms/auth';

function ForgotPasswordPage() {
  const router = useRouter();

  const handleBackToLogin = () => {
    router.push('/login');
  };


  return (
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md">
        <AuthTemplate>
          <ForgotPasswordForm
            onBackToLogin={handleBackToLogin}
          />
        </AuthTemplate>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
