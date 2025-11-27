'use client';

import { EditProfilePage } from '@/presentation/components/pages/edit-profile-page';
import { ProtectedRoute } from '@/presentation/components/routes';

export default function EditProfile() {
  return (
    <ProtectedRoute>
      <EditProfilePage />
    </ProtectedRoute>
  );
}
