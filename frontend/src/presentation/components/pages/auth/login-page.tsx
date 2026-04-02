'use client'; 

import { useRouter } from 'next/navigation';
import { LoginForm } from '@/presentation/components/organisms/auth/login-form';
import { AuthTemplate } from '@/presentation/components/templates';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { getRoleDashboardPath } from '@/shared/constants';

function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    const currentUser = useAuthStore.getState().user;
    const target = getRoleDashboardPath(currentUser?.role);
    return router.push(target);
  };

  return (
    <AuthTemplate>
      <LoginForm onSuccess={handleLoginSuccess} />
    </AuthTemplate>
  );
}

export default LoginPage;
