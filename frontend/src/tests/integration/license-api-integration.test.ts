/**
 * License API Integration Tests
 * Comprehensive tests for frontend-backend integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock the HTTP client
jest.mock('@/infrastructure/api/client', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { httpClient } from '@/infrastructure/api/client';
import {
  useLicenses,
  useLicense,
  useLicenseCreation,
  useDashboardMetrics,
  useLicenseLifecycle,
  useBulkLicenseOperations,
  useSmsPayments
} from '@/presentation/hooks/use-licenses';

// Mock error handler
jest.mock('@/presentation/hooks/use-error-handler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

// Mock toast context
jest.mock('@/presentation/contexts/toast-context', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

describe('License API Integration', () => {
  const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLicenses Hook', () => {
    it('should fetch licenses successfully', async () => {
      const mockLicenses = [
        {
          id: '1',
          key: 'LIC-001',
          product: 'Test Product',
          status: 'active',
          dba: 'Test Business',
          expiresAt: '2026-12-31T23:59:59Z',
          seatsTotal: 10,
          seatsUsed: 5
        }
      ];

      const mockResponse = {
        success: true,
        data: mockLicenses,
        meta: {
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLicenses({ page: 1, limit: 20, autoFetch: false })
      );

      expect(result.current.loading).toBe(false);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/licenses?page=1&limit=20&sortBy=created_at&sortOrder=desc');
      expect(result.current.licenses).toEqual(mockLicenses);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      const mockError = {
        response: {
          data: { message: 'Server error' },
          status: 500
        }
      };

      mockHttpClient.get.mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useLicenses({ autoFetch: false })
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.licenses).toEqual([]);
    });

    it('should support pagination', async () => {
      const mockResponse = {
        success: true,
        data: [],
        meta: {
          pagination: {
            page: 2,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: true
          }
        }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useLicenses({ autoFetch: false })
      );

      await act(async () => {
        result.current.goToPage(2);
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/licenses?page=2&limit=20&sortBy=created_at&sortOrder=desc');
    });
  });

  describe('useLicense Hook', () => {
    it('should fetch individual license', async () => {
      const mockLicense = {
        id: '1',
        key: 'LIC-001',
        status: 'active'
      };

      const mockResponse = {
        success: true,
        data: { license: mockLicense }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useLicense('1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/licenses/1');
      expect(result.current.license).toEqual(mockLicense);
    });

    it('should update license successfully', async () => {
      const mockLicense = { id: '1', status: 'active' };
      const updatedLicense = { id: '1', status: 'suspended' };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: { license: mockLicense }
      });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: { license: updatedLicense }
      });

      const { result } = renderHook(() => useLicense('1'));

      await waitFor(() => {
        expect(result.current.license).toEqual(mockLicense);
      });

      await act(async () => {
        await result.current.update({ status: 'suspended' });
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith('/licenses/1', { status: 'suspended' });
      expect(result.current.license).toEqual(updatedLicense);
    });
  });

  describe('useLicenseCreation Hook', () => {
    it('should create license successfully', async () => {
      const newLicense = {
        key: 'LIC-001',
        product: 'Test Product',
        status: 'active'
      };

      const mockResponse = {
        success: true,
        data: { license: { ...newLicense, id: '1' } }
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useLicenseCreation());

      await act(async () => {
        const created = await result.current.createLicense(newLicense);
        expect(created).toEqual({ ...newLicense, id: '1' });
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/licenses', newLicense);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('useDashboardMetrics Hook', () => {
    it('should fetch dashboard metrics', async () => {
      const mockMetrics = {
        overview: {
          total: 100,
          active: 80,
          expired: 10,
          expiringSoon: 5
        },
        utilization: {
          totalSeats: 1000,
          usedSeats: 800,
          availableSeats: 200,
          utilizationRate: 80
        },
        alerts: {
          expiringSoon: [],
          lowSeats: []
        }
      };

      const mockResponse = {
        success: true,
        data: { metrics: mockMetrics }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useDashboardMetrics({ autoFetch: false })
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/licenses/dashboard/metrics');
      expect(result.current.metrics).toEqual(mockMetrics);
    });
  });

  describe('useLicenseLifecycle Hook', () => {
    it('should renew license successfully', async () => {
      const mockLicense = { id: '1', status: 'active' };
      const mockResponse = {
        success: true,
        data: { license: mockLicense }
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useLicenseLifecycle());

      await act(async () => {
        const renewed = await result.current.renewLicense('1', {
          extensionDays: 365,
          reason: 'Annual renewal'
        });
        expect(renewed).toEqual(mockLicense);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/licenses/1/renew', {
        extensionDays: 365,
        reason: 'Annual renewal'
      });
    });

    it('should handle getLicensesRequiringAttention gracefully', async () => {
      // Mock the API call to fail
      mockHttpClient.get.mockRejectedValue(new Error('Endpoint not available'));

      const { result } = renderHook(() => useLicenseLifecycle());

      await act(async () => {
        const attention = await result.current.getLicensesRequiringAttention();
        expect(attention).toEqual({
          expiringSoon: [],
          expired: [],
          suspended: [],
          total: 0
        });
      });

      expect(result.current.error).toBe('Feature temporarily unavailable');
    });
  });

  describe('useBulkLicenseOperations Hook', () => {
    it('should perform bulk update', async () => {
      const mockResult = {
        updated: 5,
        failed: 0,
        results: []
      };

      const mockResponse = {
        success: true,
        data: mockResult
      };

      mockHttpClient.patch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkLicenseOperations());

      const bulkUpdate = {
        identifiers: { appids: ['1', '2', '3'] },
        updates: { status: 'suspended' }
      };

      await act(async () => {
        const result_data = await result.current.bulkUpdate(bulkUpdate);
        expect(result_data).toEqual(mockResult);
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/licenses/bulk', bulkUpdate);
    });
  });

  describe('useSmsPayments Hook', () => {
    it('should fetch SMS payments', async () => {
      const mockPayments = [
        {
          id: '1',
          amount: 50,
          paymentDate: '2026-01-15T00:00:00Z'
        }
      ];

      const mockTotals = {
        totalPayments: 10,
        totalAmount: 500,
        totalSmsCredits: 1000
      };

      const mockResponse = {
        success: true,
        data: {
          payments: mockPayments,
          totals: mockTotals,
          pagination: {
            page: 1,
            limit: 20,
            total: 10,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useSmsPayments({ autoFetch: false })
      );

      await act(async () => {
        await result.current.fetchPayments();
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/sms-payments?page=1&limit=20');
      expect(result.current.payments).toEqual(mockPayments);
      expect(result.current.totals).toEqual(mockTotals);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';

      mockHttpClient.get.mockRejectedValue(networkError);

      const { result } = renderHook(() =>
        useLicenses({ autoFetch: false })
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toContain('Network Error');
    });

    it('should handle 401 unauthorized', async () => {
      const authError = {
        response: {
          status: 401,
          data: { message: 'Token expired' }
        }
      };

      mockHttpClient.get.mockRejectedValue(authError);

      const { result } = renderHook(() =>
        useLicenses({ autoFetch: false })
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Token expired');
    });

    it('should handle 403 forbidden', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      };

      mockHttpClient.post.mockRejectedValue(forbiddenError);

      const { result } = renderHook(() => useLicenseCreation());

      await act(async () => {
        try {
          await result.current.createLicense({ key: 'TEST' });
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Insufficient permissions');
    });
  });

  describe('Loading States', () => {
    it('should manage loading states correctly', async () => {
      // Create a promise that resolves after a delay
      let resolvePromise: (value: any) => void;
      const delayedResponse = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockHttpClient.get.mockReturnValue(delayedResponse);

      const { result } = renderHook(() =>
        useLicenses({ autoFetch: false })
      );

      expect(result.current.loading).toBe(false);

      const fetchPromise = act(async () => {
        result.current.refetch();
      });

      expect(result.current.loading).toBe(true);

      // Resolve the delayed response
      setTimeout(() => {
        resolvePromise!({
          success: true,
          data: [],
          meta: {
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        });
      }, 100);

      await fetchPromise;
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});