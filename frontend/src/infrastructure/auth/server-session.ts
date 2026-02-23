/**
 * Server-side session utilities for SSR.
 * Use in Server Components and Route Handlers via next/headers.
 */
import { cookies } from 'next/headers';
import { User } from '@/domain/entities/user-entity';

export interface ServerSession {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

/**
 * Get session from cookies (Server Components only).
 * Call from async Server Components or Route Handlers.
 */
export async function getServerSession(): Promise<ServerSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value ?? null;
  const userCookie = cookieStore.get('user')?.value;

  let user: User | null = null;
  if (userCookie) {
    try {
      const userObj = JSON.parse(decodeURIComponent(userCookie)) as Record<string, unknown>;
      if (!userObj.name) {
        userObj.name =
          userObj.displayName ||
          userObj.username ||
          (typeof userObj.email === 'string' ? userObj.email.split('@')[0] : null) ||
          'User';
      }
      user = User.fromObject(userObj);
    } catch {
      user = null;
    }
  }

  return {
    token,
    user,
    isAuthenticated: !!token && !!user,
  };
}
