// License management use cases - Clean Architecture implementations
export {
  GetLicensesUseCaseImpl,
  type GetLicensesUseCase,
} from './get-licenses-usecase';

export {
  CreateLicenseUseCaseImpl,
  type CreateLicenseUseCase,
} from './create-license-usecase';

export {
  UpdateLicenseUseCaseImpl,
  type UpdateLicenseUseCase,
} from './update-license-usecase';

// Legacy use cases (to be migrated to Clean Architecture)
export {
  DeleteLicenseUseCase,
  type DeleteLicenseUseCaseContract,
} from './delete-license-usecase';

export {
  BulkUpdateLicensesUseCase,
  type BulkUpdateLicensesUseCaseContract,
} from './bulk-update-licenses-usecase';

export {
  BulkCreateLicensesUseCase,
  type BulkCreateLicensesUseCaseContract,
} from './bulk-create-licenses-usecase';

export {
  GetLicenseStatsUseCase,
  createGetLicenseStatsUseCase,
  type GetLicenseStatsUseCaseContract,
  type LicenseDateRange,
  type LicenseDashboardMetric,
} from './get-license-stats-usecase';
