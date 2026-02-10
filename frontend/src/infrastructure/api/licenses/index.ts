/**
 * License API - Unified entry point.
 * Maintains backward compatibility with existing imports: `from '@/infrastructure/api/licenses'`
 */

// Re-export all types
export type {
  LicenseSyncStatusResponse,
  LicenseListMeta,
  ExternalLicenseRow,
  ExternalLicenseListResponse,
  InternalLicenseRow,
  InternalLicenseListResponse,
  LicenseGetResponse,
  LicensesRequiringAttentionResponse,
  LicenseApiRow,
} from './types';

// Re-export transforms
export { transformApiLicenseToRecord, transformRecordToApiLicense } from './transforms';
export type { ExternalLicensePayload } from './transforms';

// Re-export service classes
export { LicenseApiService } from './external';
export { InternalLicenseApiService } from './internal';
export { SmsPaymentApiService } from './sms-payments';
export { UnifiedLicenseApi } from './unified';

// Import for singleton export
import { UnifiedLicenseApi } from './unified';
import { InternalLicenseApiService } from './internal';

/**
 * licenseApi - Singleton export for convenient access to all license operations.
 * This maintains backward compatibility with existing code.
 */
export const licenseApi = {
  // Unified API (recommended for new code)
  getLicenses: UnifiedLicenseApi.getLicenses,
  getLicense: UnifiedLicenseApi.getLicense,
  createLicense: UnifiedLicenseApi.createLicense,
  updateLicense: UnifiedLicenseApi.updateLicense,
  deleteLicense: UnifiedLicenseApi.deleteLicense,
  bulkUpdateLicenses: UnifiedLicenseApi.bulkUpdateLicenses,
  bulkUpdateInternalLicenses: UnifiedLicenseApi.bulkUpdateInternalLicenses,
  bulkCreateLicenses: UnifiedLicenseApi.bulkCreateLicenses,
  bulkDeleteLicenses: UnifiedLicenseApi.bulkDeleteLicenses,
  getLicenseByEmail: UnifiedLicenseApi.getLicenseByEmail,
  updateLicenseByEmail: UnifiedLicenseApi.updateLicenseByEmail,
  deleteLicenseByEmail: UnifiedLicenseApi.deleteLicenseByEmail,
  getLicenseByCountId: UnifiedLicenseApi.getLicenseByCountId,
  updateLicenseByCountId: UnifiedLicenseApi.updateLicenseByCountId,
  deleteLicenseByCountId: UnifiedLicenseApi.deleteLicenseByCountId,
  resetLicense: UnifiedLicenseApi.resetLicense,
  addRowLicense: UnifiedLicenseApi.addRowLicense,

  // Dashboard & Analytics
  getDashboardMetrics: UnifiedLicenseApi.getDashboardMetrics,
  getLicenseAnalytics: UnifiedLicenseApi.getLicenseAnalytics,
  getLicenseSyncStatus: UnifiedLicenseApi.getLicenseSyncStatus,

  // Lifecycle Management
  getLifecycleStatus: UnifiedLicenseApi.getLifecycleStatus,
  renewLicense: UnifiedLicenseApi.renewLicense,
  getRenewalPreview: UnifiedLicenseApi.getRenewalPreview,
  extendLicense: UnifiedLicenseApi.extendLicense,
  expireLicense: UnifiedLicenseApi.expireLicense,
  getExpirationPreview: UnifiedLicenseApi.getExpirationPreview,
  reactivateLicense: UnifiedLicenseApi.reactivateLicense,
  getLicensesRequiringAttention: UnifiedLicenseApi.getLicensesRequiringAttention,
  bulkRenewLicenses: UnifiedLicenseApi.bulkRenewLicenses,
  bulkExpireLicenses: UnifiedLicenseApi.bulkExpireLicenses,
  processLifecycle: UnifiedLicenseApi.processLifecycle,

  // SMS Payments
  getSmsPayments: UnifiedLicenseApi.getSmsPayments,
  addSmsPayment: UnifiedLicenseApi.addSmsPayment,

  // Legacy API methods (for backward compatibility)
  getInternalLicenses: InternalLicenseApiService.getLicenses,
  getInternalLicense: InternalLicenseApiService.getLicense,
  createInternalLicense: InternalLicenseApiService.createLicense,
  updateInternalLicense: InternalLicenseApiService.updateLicense,
  deleteInternalLicense: InternalLicenseApiService.deleteLicense,
  bulkCreateInternalLicenses: InternalLicenseApiService.bulkCreateLicenses,
  bulkDeleteInternalLicenses: InternalLicenseApiService.bulkDeleteLicenses,
} as const;
