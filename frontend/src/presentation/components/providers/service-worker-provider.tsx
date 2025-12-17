'use client';

'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/shared/utils/service-worker';
import { useToast } from '@/presentation/contexts/toast-context';
import { info, error } from '@/shared/utils/logger';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const { info, error: showError } = useToast();

  useEffect(() => {
    // Only register service worker in production and when supported
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      registerServiceWorker({
        onSuccess: (registration) => {
          info('[SW] Service worker registered successfully');
        },
        onUpdate: (registration) => {
          info('App updated! Refresh to get the latest version.', {
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload()
            }
          });
        },
        onError: (swError) => {
          error('[SW] Service worker registration failed:', swError);
          // Don't show error to user as it's not critical
        }
      });
    }
  }, [info, showError]);

  return <>{children}</>;
}
