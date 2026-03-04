'use client';

/**
 * Client-only content for /profile/change-password.
 * Loaded dynamically with ssr: false so the server never loads DashboardTemplate.
 */
import { ChangePasswordPage } from './change-password-page';

export function ProfileChangePasswordContent() {
  return <ChangePasswordPage />;
}
