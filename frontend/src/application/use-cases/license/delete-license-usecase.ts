import { licenseApiService, LicenseServiceContract } from '@/application/services/license-services';
import logger, { generateCorrelationId } from '@/shared/utils/logger';

/**
 * Application Use Case: Delete License
 * Handles deleting licenses
 */
export interface DeleteLicenseUseCaseContract {
  execute(id: number): Promise<void>;
}


export class DeleteLicenseUseCase implements DeleteLicenseUseCaseContract {
  private readonly useCaseLogger = logger.createChild({
    component: 'DeleteLicenseUseCase',
  });

  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(id: number): Promise<void> {
    const correlationId = generateCorrelationId();

    try {
      await this.licenseService.delete(id);
    } catch (error) {
      this.useCaseLogger.error(`Failed to delete license`, {
        correlationId,
        licenseId: id,
        operation: 'delete_license_usecase_error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to delete license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

