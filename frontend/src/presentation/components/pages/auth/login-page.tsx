'use client';

import { useRouter } from 'next/navigation';
import { LoginForm } from '@/presentation/components/organisms/form/login-form';
import { AuthTemplate } from '@/presentation/components/templates';
import { useAuthStore } from '@/infrastructure/stores/auth-store';

function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    const currentUser = useAuthStore.getState().user;

    if (!currentUser) {
      return router.push('/dashboard');
    }

    return router.push('/dashboard');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md">
        <AuthTemplate >
          <LoginForm
            onSuccess={handleLoginSuccess}
          />
        </AuthTemplate>
      </div>
    </div>
  );
}

export default LoginPage;
