import { Suspense } from 'react';
import { LoginPage } from '@/presentation/components/pages';

export default function Login() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
