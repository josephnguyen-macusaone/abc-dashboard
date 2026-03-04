'use client';

import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/presentation/components/routes';
import { LoadingOverlay } from '@/presentation/components/atoms';

const ProfileChangePasswordContent = dynamic(
  () =>
    import('@/presentation/components/pages/profile/profile-change-password-page-content').then(
      (m) => ({ default: m.ProfileChangePasswordContent })
    ),
  {
    ssr: false,
    loading: () => <LoadingOverlay text="Loading change password..." />,
  }
);

export default function ChangePassword() {
  return (
    <ProtectedRoute>
      <ProfileChangePasswordContent />
    </ProtectedRoute>
  );
}
