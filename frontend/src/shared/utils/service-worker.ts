// Service Worker utilities for ABC Dashboard
// Handles registration, offline functionality, and background sync

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface OfflineStatus {
  isOnline: boolean;
  isServiceWorkerSupported: boolean;
  isServiceWorkerRegistered: boolean;
  hasPendingSync: boolean;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private syncResults: SyncResult[] = [];
  private isOnline = true;
  private config: ServiceWorkerConfig = {};

  constructor() {
    // Only setup listeners in browser environment
    if (typeof window !== 'undefined') {
      this.setupNetworkListeners();
      this.setupMessageListener();
    }
  }

  // Register the service worker
  async register(config: ServiceWorkerConfig = {}): Promise<void> {
    this.config = config;

    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service workers not supported');
      this.config.onError?.(new Error('Service workers not supported'));
      return;
    }

    try {
      console.log('[SW] Registering service worker...');

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Service worker registered:', this.registration);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.config.onUpdate?.(this.registration!);
            }
          });
        }
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service worker controller changed');
        // Optionally reload the page
        // window.location.reload();
      });

      this.config.onSuccess?.(this.registration);

    } catch (error) {
      console.error('[SW] Registration failed:', error);
      this.config.onError?.(error as Error);
    }
  }

  // Unregister the service worker
  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
      console.log('[SW] Service worker unregistered');
    }
  }

  // Check if service worker is registered
  isRegistered(): boolean {
    return !!this.registration;
  }

  // Get current registration
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Request background sync
  async requestBackgroundSync(tag = 'bg-sync-queue'): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    try {
      // Type assertion for background sync API
      const syncManager = (this.registration as any).sync;
      if (syncManager) {
        await syncManager.register(tag);
        console.log('[SW] Background sync requested:', tag);
      } else {
        throw new Error('Background sync not available');
      }
    } catch (error) {
      console.error('[SW] Background sync registration failed:', error);
      throw error;
    }
  }

  // Send message to service worker
  async sendMessage(message: any): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active service worker');
    }

    const channel = new MessageChannel();
    const controller = navigator.serviceWorker.controller;

    return new Promise((resolve, reject) => {
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      controller.postMessage(message, [channel.port2]);
    });
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    static: number;
    api: number;
    images: number;
    total: number;
  }> {
    try {
      const stats = await this.sendMessage({ type: 'GET_CACHE_STATS' });
      return stats;
    } catch (error) {
      console.warn('[SW] Could not get cache stats:', error);
      return { static: 0, api: 0, images: 0, total: 0 };
    }
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLEAR_ALL_CACHES' });
      console.log('[SW] All caches cleared');
    } catch (error) {
      console.error('[SW] Failed to clear caches:', error);
    }
  }

  // Get offline status
  getOfflineStatus(): OfflineStatus {
    return {
      isOnline: this.isOnline,
      isServiceWorkerSupported: 'serviceWorker' in navigator,
      isServiceWorkerRegistered: !!this.registration,
      hasPendingSync: this.syncResults.some(result => !result.success)
    };
  }

  // Get sync results
  getSyncResults(): SyncResult[] {
    return [...this.syncResults];
  }

  // Clear sync results
  clearSyncResults(): void {
    this.syncResults = [];
  }

  // Setup network status listeners
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[SW] Network online');
      this.isOnline = true;
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('[SW] Network offline');
      this.isOnline = false;
      this.handleNetworkChange(false);
    });

    // Initial status
    this.isOnline = navigator.onLine;
  }

  // Handle network status changes
  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    if (isOnline && this.registration) {
      // Try to sync when coming back online
      try {
        await this.requestBackgroundSync();
      } catch (error) {
        console.warn('[SW] Could not request sync on reconnect:', error);
      }
    }

    // Notify listeners
    this.notifyNetworkStatus(isOnline);
  }

  // Setup message listener for service worker messages
  private setupMessageListener(): void {
    if (typeof navigator === 'undefined') return;

    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SYNC_COMPLETE':
          this.handleSyncComplete(data);
          break;
        case 'CACHE_STATS':
          // Handle cache stats if needed
          break;
        default:
          console.log('[SW] Unknown message type:', type);
      }
    });
  }

  // Handle sync completion
  private handleSyncComplete(results: SyncResult[]): void {
    console.log('[SW] Sync completed:', results);
    this.syncResults = results;
    this.notifySyncResults(results);
  }

  // Notify network status change (for external listeners)
  private notifyNetworkStatus(isOnline: boolean): void {
    if (typeof window === 'undefined') return;

    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('networkStatusChange', {
      detail: { isOnline }
    }));
  }

  // Notify sync results (for external listeners)
  private notifySyncResults(results: SyncResult[]): void {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('syncResults', {
      detail: { results }
    }));
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Export convenience functions
export const registerServiceWorker = (config?: ServiceWorkerConfig) =>
  serviceWorkerManager.register(config);

export const unregisterServiceWorker = () =>
  serviceWorkerManager.unregister();

export const requestBackgroundSync = (tag?: string) =>
  serviceWorkerManager.requestBackgroundSync(tag);

export const getOfflineStatus = () =>
  serviceWorkerManager.getOfflineStatus();

export const getCacheStats = () =>
  serviceWorkerManager.getCacheStats();

export const clearAllCaches = () =>
  serviceWorkerManager.clearAllCaches();

// React hook for using service worker
export function useServiceWorker() {
  return {
    register: serviceWorkerManager.register.bind(serviceWorkerManager),
    unregister: serviceWorkerManager.unregister.bind(serviceWorkerManager),
    isRegistered: serviceWorkerManager.isRegistered.bind(serviceWorkerManager),
    getRegistration: serviceWorkerManager.getRegistration.bind(serviceWorkerManager),
    requestBackgroundSync: serviceWorkerManager.requestBackgroundSync.bind(serviceWorkerManager),
    getOfflineStatus: serviceWorkerManager.getOfflineStatus.bind(serviceWorkerManager),
    getCacheStats: serviceWorkerManager.getCacheStats.bind(serviceWorkerManager),
    clearAllCaches: serviceWorkerManager.clearAllCaches.bind(serviceWorkerManager),
    getSyncResults: serviceWorkerManager.getSyncResults.bind(serviceWorkerManager),
    clearSyncResults: serviceWorkerManager.clearSyncResults.bind(serviceWorkerManager),
  };
}

// Utility functions
export const isOnline = () => navigator.onLine;
export const isServiceWorkerSupported = () => 'serviceWorker' in navigator;

// Background sync queue (for storing failed requests)
export class BackgroundSyncQueue {
  private queue: Array<{
    id: string;
    request: Request;
    timestamp: number;
  }> = [];

  async add(request: Request): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({
      id,
      request: request.clone(),
      timestamp: Date.now()
    });

    console.log('[SW] Added to sync queue:', id);
    return id;
  }

  async remove(id: string): Promise<void> {
    this.queue = this.queue.filter(item => item.id !== id);
    console.log('[SW] Removed from sync queue:', id);
  }

  async getAll(): Promise<Array<{ id: string; request: Request; timestamp: number }>> {
    return this.queue.map(item => ({ ...item }));
  }

  async clear(): Promise<void> {
    this.queue = [];
    console.log('[SW] Cleared sync queue');
  }

  get size(): number {
    return this.queue.length;
  }
}

// Export queue instance
export const backgroundSyncQueue = new BackgroundSyncQueue();
