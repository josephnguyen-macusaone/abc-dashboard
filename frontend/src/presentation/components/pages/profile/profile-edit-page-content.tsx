'use client';

/**
 * Client-only content for /profile/edit.
 * Loaded dynamically with ssr: false so the server never loads DashboardTemplate.
 */
import { EditProfilePage } from './edit-profile-page';

export function ProfileEditContent() {
  return <EditProfilePage />;
}
