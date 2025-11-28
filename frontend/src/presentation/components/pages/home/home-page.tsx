'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/presentation/contexts/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Redirect authenticated users to dashboard, others to login
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Show loading state while redirecting
  return null;
}
