'use client';

import { useRouter } from 'next/navigation';
import { LoginForm } from '@/presentation/components/organisms/form/login-form';
import { ThemeToggle } from '@/presentation/components/molecules';
import { AuthTemplate } from '@/presentation/components/templates';
import { useAuth } from '@/presentation/contexts/auth-context';

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
        {/* Login Form Section */}
        <AuthTemplate
          title="Welcome Back"
          subtitle="Sign in to your account to continue"
        >
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        </AuthTemplate>
      </div>
    </div>
  );
}

export default LoginPage;
