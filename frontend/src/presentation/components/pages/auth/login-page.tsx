'use client'; 

import { useRouter } from 'next/navigation';
import { LoginForm } from '@/presentation/components/organisms/auth/login-form';
import { AuthTemplate } from '@/presentation/components/templates';
import { useAuthStore } from '@/infrastructure/stores/auth';

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
    <AuthTemplate>
      <LoginForm onSuccess={handleLoginSuccess} />
    </AuthTemplate>
  );
}

export default LoginPage;
