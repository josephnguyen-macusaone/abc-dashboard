import { licenseService, LicenseServiceContract } from '@/application/services/license-management-service';

/**
 * Delete License Use Case
 * Handles deleting licenses
 */
export interface DeleteLicenseUseCaseContract {
  execute(id: number): Promise<void>;
}

export class DeleteLicenseUseCase implements DeleteLicenseUseCaseContract {
  constructor(private readonly licenseService: LicenseServiceContract) {}

  async execute(id: number): Promise<void> {
    try {
      await this.licenseService.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete license: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create DeleteLicenseUseCase
 */
export function createDeleteLicenseUseCase(): DeleteLicenseUseCase {
  return new DeleteLicenseUseCase(licenseService);
}
