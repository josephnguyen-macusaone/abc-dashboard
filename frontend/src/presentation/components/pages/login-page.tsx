'use client';

import { useRouter } from 'next/navigation';
import { LoginForm } from '@/presentation/components/organisms/form/login-form';
import { ThemeToggle } from '@/presentation/components/molecules';
import { AuthTemplate } from '@/presentation/components/templates';
import { useAuth } from '@/presentation/contexts/auth-context';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';

function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLoginSuccess = () => {
    // Redirect based on user role
    if (user?.role) {
      router.push(`/dashboard/${user.role}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleSwitchToRegister = () => {
    router.push('/register');
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
            title="Something went wrong"
            subtitle="We encountered an error while loading the login page"
          >
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Please try refreshing the page or contact support if the problem persists.
              </p>
            </div>
          </AuthTemplate>
        }>
          {/* Login Form Section */}
          <AuthTemplate
            title="ABC Dashboard"
            subtitle="Welcome back to your dashboard"
          >
            <LoginForm
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={handleSwitchToRegister}
            />
          </AuthTemplate>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default LoginPage;
