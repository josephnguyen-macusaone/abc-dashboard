import VerifyEmailPage from '@/presentation/components/pages/verify-email-page';

interface VerifyEmailProps {
  searchParams: {
    email?: string;
    token?: string;
  };
}

export default function VerifyEmail({ searchParams }: VerifyEmailProps) {
  const email = searchParams.email;
  const token = searchParams.token;

  return <VerifyEmailPage email={email} token={token} />;
}
