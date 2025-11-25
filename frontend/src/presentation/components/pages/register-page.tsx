'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/presentation/components/organisms/form/register-form';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';

function RegisterPage() {
  const router = useRouter();

  const handleRegisterSuccess = (email: string) => {
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <AuthTemplate
      title="Sign up"
      subtitle="Create your account to start your journey today"
    >
      <RegisterForm
        onSuccess={(email) => handleRegisterSuccess(email)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </AuthTemplate>
  );
}

export default RegisterPage;
