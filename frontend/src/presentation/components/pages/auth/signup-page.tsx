'use client';

import { SignupForm } from '@/presentation/components/organisms/auth/signup-form';
import { AuthTemplate } from '@/presentation/components/templates';

function SignupPage() {
  return (
    <AuthTemplate>
      <SignupForm />
    </AuthTemplate>
  );
}

export default SignupPage;
