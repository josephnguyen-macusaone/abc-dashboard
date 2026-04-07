'use client'; 

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/presentation/components/organisms/auth/login-form';
import { AuthTemplate } from '@/presentation/components/templates';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { getRoleDashboardPath } from '@/shared/constants';
import { useToast } from '@/presentation/contexts/toast-context';

/** Survives React Strict Mode remounts so query-string flash toasts only fire once per navigation. */
let consumedLoginFlashQueryKey: string | null = null;

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Show a success toast when redirected here after email verification or password reset.
  useEffect(() => {
    const verified = searchParams.get('verified') === 'true';
    const reset = searchParams.get('reset') === 'true';
    const passwordLinkSent = searchParams.get('password_link_sent') === 'true';

    if (!verified && !reset && !passwordLinkSent) {
      consumedLoginFlashQueryKey = null;
      return;
    }

    const queryKey = searchParams.toString();
    if (consumedLoginFlashQueryKey === queryKey) return;
    consumedLoginFlashQueryKey = queryKey;

    if (verified) {
      toast.success('Email verified! You can now log in.');
    } else if (reset) {
      toast.success('Password reset! You can now log in with your new password.');
    } else {
      toast.success(
        'If an account exists for that email, we sent a link to reset your password. Check your inbox.'
      );
    }
    router.replace('/login');
  }, [searchParams, toast, router]);

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
