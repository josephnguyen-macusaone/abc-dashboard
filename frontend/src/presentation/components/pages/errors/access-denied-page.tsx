'use client';

import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { AccessDeniedCard } from '@/presentation/components/molecules/ui';

export interface AccessDeniedPageProps {
  title?: string;
  message?: string;
}

export function AccessDeniedPage({
  title,
  message,
}: AccessDeniedPageProps) {
  return (
    <AuthTemplate>
      <AccessDeniedCard
        title={title}
        message={message}
      />
    </AuthTemplate>
  );
}
