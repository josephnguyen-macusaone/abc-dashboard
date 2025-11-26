'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/presentation/components/organisms/form/register-form';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';

function RegisterPage() {
  const router = useRouter();

  const handleRegisterSuccess = (email: string, username: string) => {
    router.push(`/verify-email?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`);
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  return (
    <ErrorBoundary fallback={
      <AuthTemplate
        title="Something went wrong"
        subtitle="We encountered an error while loading the registration page"
      >
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </AuthTemplate>
    }>
      <AuthTemplate
        title="ABC Dashboard"
        subtitle="Welcome to our dashboard"
      >
        <RegisterForm
          onSuccess={(email, username) => handleRegisterSuccess(email, username)}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </AuthTemplate>
    </ErrorBoundary>
  );
}

export default RegisterPage;
