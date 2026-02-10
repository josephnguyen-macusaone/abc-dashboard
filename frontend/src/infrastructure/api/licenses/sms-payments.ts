import { httpClient } from '@/infrastructure/api/client';
import type { SmsPaymentsResponse, AddSmsPaymentResponse } from './types';

/**
 * SMS Payment Management API Service.
 * Handles SMS payment operations.
 */
export class SmsPaymentApiService {
  /**
   * Get SMS payments
   */
  static async getSmsPayments(params: {
    appid?: string;
    emailLicense?: string;
    countid?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<SmsPaymentsResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const url = `/sms-payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return httpClient.get(url);
  }

  /**
   * Add SMS payment
   */
  static async addSmsPayment(paymentData: {
    appid?: string;
    emailLicense?: string;
    countid?: number;
    amount: number;
    paymentDate?: string;
    description?: string;
  }): Promise<AddSmsPaymentResponse> {
    return httpClient.post('/add-sms-payment', paymentData);
  }
}
