'use client';

import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/presentation/components/routes';
import { LoadingOverlay } from '@/presentation/components/atoms';

const ProfileEditContent = dynamic(
  () =>
    import('@/presentation/components/pages/profile/profile-edit-page-content').then((m) => ({
      default: m.ProfileEditContent,
    })),
  {
    ssr: false,
    loading: () => <LoadingOverlay text="Loading edit profile..." />,
  }
);

export default function EditProfile() {
  return (
    <ProtectedRoute>
      <ProfileEditContent />
    </ProtectedRoute>
  );
}
