/**
 * Tests for useRealtimeSync hook
 */
import { renderHook } from '@testing-library/react';
import { useRealtimeSync } from '@/presentation/hooks/use-realtime-sync';

// Mock socket.io-client
const mockOn = jest.fn();
const mockDisconnect = jest.fn();
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: mockOn,
    disconnect: mockDisconnect,
  })),
}));

// Mock useAuthStore
jest.mock('@/infrastructure/stores/auth/auth-store', () => ({
  useAuthStore: jest.fn((selector: (s: { token?: string; isAuthenticated?: boolean }) => unknown) => {
    const state = { token: 'test-token', isAuthenticated: true };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock useLicenseStore
const mockFetchLicenses = jest.fn();
const mockFetchDashboardMetrics = jest.fn();
const mockFetchLicensesRequiringAttention = jest.fn();
const mockFetchSyncStatus = jest.fn();
jest.mock('@/infrastructure/stores/license', () => ({
  useLicenseStore: jest.fn((selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      fetchLicenses: mockFetchLicenses,
      fetchDashboardMetrics: mockFetchDashboardMetrics,
      fetchLicensesRequiringAttention: mockFetchLicensesRequiringAttention,
      fetchSyncStatus: mockFetchSyncStatus,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock resolveRealtimeSocketUrl
jest.mock('@/shared/constants/api', () => ({
  resolveRealtimeSocketUrl: () => 'http://localhost:5000',
}));

describe('useRealtimeSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('connects socket when authenticated', () => {
    const { io } = require('socket.io-client');
    renderHook(() => useRealtimeSync());

    expect(io).toHaveBeenCalledWith('http://localhost:5000', {
      path: '/socket.io',
      auth: { token: 'test-token' },
      transports: ['websocket', 'polling'],
    });
  });

  it('registers license:sync_complete and license:data_changed handlers', () => {
    renderHook(() => useRealtimeSync());

    expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('connect_error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('license:sync_complete', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('license:data_changed', expect.any(Function));
  });

  it('calls refetch handlers when license:sync_complete fires', () => {
    let syncCompleteHandler: () => void = () => {};
    mockOn.mockImplementation((event: string, handler: () => void) => {
      if (event === 'license:sync_complete') syncCompleteHandler = handler;
    });

    renderHook(() => useRealtimeSync());
    syncCompleteHandler();

    expect(mockFetchLicenses).toHaveBeenCalled();
    expect(mockFetchDashboardMetrics).toHaveBeenCalled();
    expect(mockFetchLicensesRequiringAttention).toHaveBeenCalled();
    expect(mockFetchSyncStatus).toHaveBeenCalled();
  });

  it('disconnects socket on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeSync());
    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
