# License API Module

This directory contains the refactored license API layer, split into domain-specific modules for better maintainability and type safety.

## Structure

```
licenses/
├── index.ts           # Main entry point with backward-compatible exports
├── types.ts           # TypeScript DTOs and response interfaces
├── transforms.ts      # Data transformation functions (API ↔ LicenseRecord)
├── external.ts        # External API service (LicenseApiService)
├── internal.ts        # Internal API service (InternalLicenseApiService)
├── sms-payments.ts    # SMS payment operations (SmsPaymentApiService)
├── unified.ts         # Unified API facade (UnifiedLicenseApi)
└── README.md          # This file
```

## Usage

### Recommended (Unified API)
```typescript
import { licenseApi } from '@/infrastructure/api/licenses';

// Get licenses with pagination
const { licenses, pagination } = await licenseApi.getLicenses({ page: 1, limit: 20 });

// Get single license
const license = await licenseApi.getLicense('license-id');

// Create/update/delete
const created = await licenseApi.createLicense(licenseData);
const updated = await licenseApi.updateLicense('id', updates);
await licenseApi.deleteLicense('id');
```

### Direct Service Access (Advanced)
```typescript
import { InternalLicenseApiService, LicenseApiService } from '@/infrastructure/api/licenses';

// Use internal API directly
const response = await InternalLicenseApiService.getLicenses({ page: 1 });

// Use external API directly
const { licenses, pagination } = await LicenseApiService.getLicenses({ page: 1 });
```

## Module Responsibilities

### `types.ts`
- DTOs mirroring backend API response shapes
- Separate interfaces for external and internal APIs
- Shared metadata types (pagination, etc.)

### `transforms.ts`
- `transformApiLicenseToRecord`: Convert backend API data → frontend `LicenseRecord`
- `transformRecordToApiLicense`: Convert frontend `LicenseRecord` → backend API payload
- Handles field name differences (e.g., `ActivateDate` vs `startDay`)
- Normalizes status values (string vs number)
- Converts date formats

### `external.ts` (LicenseApiService)
- Manages external license system integration
- Endpoints: `/external-licenses/*`
- Methods: CRUD, bulk operations, dashboard metrics
- Uses external field names: `ActivateDate`, `monthlyFee`, `license_type`, etc.

### `internal.ts` (InternalLicenseApiService)
- Internal backend license management
- Endpoints: `/licenses/*`
- Methods: CRUD, bulk operations, lifecycle, analytics, sync status
- Uses internal field names: `startDay`, `lastPayment`, `plan`, etc.

### `sms-payments.ts` (SmsPaymentApiService)
- SMS payment operations
- Endpoints: `/sms-payments/*`, `/add-sms-payment`
- Methods: `getSmsPayments`, `addSmsPayment`

### `unified.ts` (UnifiedLicenseApi)
- **Recommended API** for application code
- Tries internal API first, falls back to external API on failure
- Provides consistent interface regardless of backend
- Handles error recovery and logging

### `index.ts`
- Main entry point
- Exports `licenseApi` singleton for convenient access
- Re-exports all types, transforms, and service classes
- Maintains backward compatibility with old imports

## Migration Notes

### Before (Old Structure)
```typescript
import { licenseApi, LicenseSyncStatusResponse } from '@/infrastructure/api/licenses';
```

### After (Same Import Path)
```typescript
import { licenseApi, LicenseSyncStatusResponse } from '@/infrastructure/api/licenses';
```

**No changes required** - the import path remains the same! The `licenses` folder now acts as a module with an `index.ts` barrel export.

## Type Safety Improvements

The refactor introduces strict DTOs that match the actual backend API shapes:

- `ExternalLicenseRow` / `ExternalLicenseListResponse` - External API
- `InternalLicenseRow` / `InternalLicenseListResponse` - Internal API
- `LicenseListMeta` - Flat pagination metadata (shared by both)
- `LicenseSyncStatusResponse`, `LicenseGetResponse`, etc.

## Testing

No code changes should be required in consumers. The refactor maintains full backward compatibility:

✅ Same import paths  
✅ Same exported names  
✅ Same method signatures  
✅ Same runtime behavior  

## Future Enhancements

If further granularity is needed, consider splitting:

- `internal.ts` → `internal/crud.ts`, `internal/lifecycle.ts`, `internal/analytics.ts`
- `external.ts` → `external/crud.ts`, `external/bulk.ts`, `external/metrics.ts`
- Adding OpenAPI code generation for DTOs

## Related Documentation

- Full refactor plan: `/docs/PLAN_LICENSE_API_REFACTOR.md`
- Backend API routes: `backend/src/infrastructure/routes/license-routes.js`
- Backend Swagger docs: `backend/src/infrastructure/config/swagger.js`
