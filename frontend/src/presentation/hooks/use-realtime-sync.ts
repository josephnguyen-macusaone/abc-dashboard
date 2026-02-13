'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/infrastructure/stores/auth/auth-store';
import { useLicenseStore } from '@/infrastructure/stores/license';
import { resolveRealtimeSocketUrl } from '@/shared/constants/api';
import logger from '@/shared/helpers/logger';

const log = logger.createChild({ component: 'useRealtimeSync' });

/**
 * Connects to Socket.IO when authenticated and subscribes to license:sync_complete
 * and license:data_changed. Triggers store refetch on events.
 * Falls back to Phase 1 polling (SyncStatusIcon) when WebSocket is unavailable.
 */
export function useRealtimeSync() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socketRef = useRef<Socket | null>(null);

  const fetchLicenses = useLicenseStore((s) => s.fetchLicenses);
  const fetchDashboardMetrics = useLicenseStore((s) => s.fetchDashboardMetrics);
  const fetchLicensesRequiringAttention = useLicenseStore((s) => s.fetchLicensesRequiringAttention);
  const fetchSyncStatus = useLicenseStore((s) => s.fetchSyncStatus);

  const onDataChangedRef = useRef(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchLicenses();
      fetchDashboardMetrics();
      fetchLicensesRequiringAttention();
      fetchSyncStatus();
    }
  });
  onDataChangedRef.current = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      fetchLicenses();
      fetchDashboardMetrics();
      fetchLicensesRequiringAttention();
      fetchSyncStatus();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !token) return;

    const url = resolveRealtimeSocketUrl();
    if (!url) return;

    const socket = io(url, {
      path: '/socket.io',
      auth: { token },
      transports: ['polling', 'websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      log.debug('Realtime socket connected');
    });

    socket.on('connect_error', (err) => {
      log.warn('Realtime socket connect error', { error: err.message });
    });

    socket.on('license:sync_complete', () => {
      log.debug('Received license:sync_complete, refetching');
      onDataChangedRef.current();
    });

    socket.on('license:data_changed', () => {
      log.debug('Received license:data_changed, refetching');
      onDataChangedRef.current();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token]);
}
