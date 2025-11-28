'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/presentation/components/organisms/form/register-form';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { ErrorBoundary } from '@/presentation/components/organisms/common/error-boundary';
import { Typography } from '@/presentation/components/atoms';

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
      >
        <div className="text-center">
          {/* MAC USA ONE Typography: Body M for error message */}
          <Typography variant="body-m" color="muted">
            Please try refreshing the page or contact support if the problem persists.
          </Typography>
        </div>
      </AuthTemplate>
    }>
      <AuthTemplate
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
