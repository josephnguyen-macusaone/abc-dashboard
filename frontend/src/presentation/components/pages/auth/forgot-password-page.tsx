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
    <AuthTemplate>
      <ForgotPasswordForm onBackToLogin={handleBackToLogin} />
    </AuthTemplate>
  );
}

export default ForgotPasswordPage;
