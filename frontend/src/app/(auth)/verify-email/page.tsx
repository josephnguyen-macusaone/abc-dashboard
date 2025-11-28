import { VerifyEmailPage } from '@/presentation/components/pages';
import { ProtectedRoute } from '@/presentation/components/routes';

interface VerifyEmailProps {
  searchParams: {
    token?: string;
    email?: string;
  };
}

export default function VerifyEmail({ searchParams }: VerifyEmailProps) {
  const token = searchParams.token;
  const email = searchParams.email;

  return (
    <ProtectedRoute requireAuth={false} redirectTo="/dashboard">
      <VerifyEmailPage token={token} email={email} />
    </ProtectedRoute>
  );
}
