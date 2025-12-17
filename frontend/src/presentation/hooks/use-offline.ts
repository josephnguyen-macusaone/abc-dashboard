import { useState, useEffect } from 'react';
import { getOfflineStatus, isOnline, isServiceWorkerSupported } from '@/shared/utils/service-worker';
import { getCacheStats } from '@/shared/utils/service-worker';

export interface OfflineState {
  isOnline: boolean;
  isServiceWorkerSupported: boolean;
  isServiceWorkerRegistered: boolean;
  hasPendingSync: boolean;
  cacheStats?: {
    static: number;
    api: number;
    images: number;
    total: number;
  };
}

/**
 * Hook for managing offline functionality and service worker status
 */
export function useOffline() {
  const [state, setState] = useState<OfflineState>(() => ({
    ...getOfflineStatus(),
    cacheStats: undefined
  }));

  const [isLoading, setIsLoading] = useState(false);

  // Update offline status
  const updateStatus = async () => {
    setIsLoading(true);
    try {
      const status = getOfflineStatus();
      const cacheStats = await getCacheStats();

      setState({
        ...status,
        cacheStats
      });
    } catch (error) {
      console.error('Failed to update offline status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for network status changes
  useEffect(() => {
    const handleNetworkChange = () => {
      updateStatus();
    };

    const handleSyncResults = () => {
      updateStatus();
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    window.addEventListener('syncResults', handleSyncResults);

    // Initial status
    updateStatus();

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      window.removeEventListener('syncResults', handleSyncResults);
    };
  }, []);

  // Refresh cache stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const cacheStats = await getCacheStats();
        setState(prev => ({ ...prev, cacheStats }));
      } catch (error) {
        // Silently fail
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    isLoading,
    refreshStatus: updateStatus,
    // Computed values
    isOffline: !state.isOnline,
    canUseOfflineFeatures: state.isServiceWorkerSupported && state.isServiceWorkerRegistered,
    hasCache: state.cacheStats ? state.cacheStats.total > 0 : false
  };
}

/**
 * Hook for background sync functionality
 */
export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype);
  }, []);

  const requestSync = async (tag = 'bg-sync-queue') => {
    if (!isSupported) {
      throw new Error('Background sync not supported');
    }

    setIsRequesting(true);
    try {
      const registration = await navigator.serviceWorker.ready;
        // Type assertion for background sync API
      const syncManager = (registration as any).sync;
      if (syncManager) {
        await syncManager.register(tag);
        console.log('Background sync requested:', tag);
      } else {
        throw new Error('Background sync not available');
      }
    } catch (error) {
      console.error('Failed to request background sync:', error);
      throw error;
    } finally {
      setIsRequesting(false);
    }
  };

  return {
    isSupported,
    isRequesting,
    requestSync
  };
}

/**
 * Hook for cache management
 */
export function useCache() {
  const [isClearing, setIsClearing] = useState(false);

  const clearAllCaches = async () => {
    setIsClearing(true);
    try {
      const { clearAllCaches } = await import('@/shared/utils/service-worker');
      await clearAllCaches();
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear caches:', error);
      throw error;
    } finally {
      setIsClearing(false);
    }
  };

  return {
    isClearing,
    clearAllCaches
  };
}
