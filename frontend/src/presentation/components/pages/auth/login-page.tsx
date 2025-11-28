'use client';

import { useRouter } from 'next/navigation';
import { LoginForm } from '@/presentation/components/organisms/form/login-form';
import { ThemeToggle } from '@/presentation/components/molecules';
import { AuthTemplate } from '@/presentation/components/templates';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { Typography } from '@/presentation/components/atoms';

function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-background px-4 py-6 sm:px-6 lg:px-8 overflow-hidden">
      {/* Theme switcher in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-8">
        <ErrorBoundary fallback={
          <AuthTemplate
          >
            <div className="text-center">
              {/* MAC USA ONE Typography: Body M for error message */}
              <Typography variant="body-m" color="muted">
                Please try refreshing the page or contact support if the problem persists.
              </Typography>
            </div>
          </AuthTemplate>
        }>
          {/* Login Form Section */}
          <AuthTemplate
          >
            <LoginForm
              onSuccess={handleLoginSuccess}
            />
          </AuthTemplate>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default LoginPage;
