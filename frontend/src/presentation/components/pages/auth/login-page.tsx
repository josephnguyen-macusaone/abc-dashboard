'use client';

import { LoginForm } from '@/presentation/components/organisms/auth/login-form';
import { AuthTemplate } from '@/presentation/components/templates';

function LoginPage() {
  const handleLoginSuccess = () => {
    // Use full-page navigation instead of router.push() to avoid a Next.js App Router
    // RSC conflict: after login the middleware redirects the /login page RSC (307) while
    // router.push concurrently navigates to /dashboard, causing one RSC fetch to abort
    // with a NetworkError. A hard navigation sidesteps both conflicts cleanly.
    window.location.replace('/dashboard');
  };

  return (
    <AuthTemplate>
      <LoginForm onSuccess={handleLoginSuccess} />
    </AuthTemplate>
  );
}

export default LoginPage;
