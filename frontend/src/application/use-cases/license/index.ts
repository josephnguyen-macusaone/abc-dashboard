// License management use cases
export {
  GetLicensesUseCase,
  type GetLicensesUseCaseContract,
} from './get-licenses-usecase';

export {
  CreateLicenseUseCase,
  type CreateLicenseUseCaseContract,
} from './create-license-usecase';

export {
  UpdateLicenseUseCase,
  type UpdateLicenseUseCaseContract,
} from './update-license-usecase';

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
