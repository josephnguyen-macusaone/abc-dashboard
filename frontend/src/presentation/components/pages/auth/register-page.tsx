'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/presentation/components/organisms/auth/register-form';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';

function RegisterPage() {
  const router = useRouter();

  const handleRegisterSuccess = (email: string, username: string) => {
    router.push(`/verify-email?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`);
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md space-y-8">
        <AuthTemplate>
          <RegisterForm
            onSuccess={(email, username) => handleRegisterSuccess(email, username)}
            onSwitchToLogin={handleSwitchToLogin}
          />
        </AuthTemplate>
      </div>
    </div>
  );
}

export default RegisterPage;
