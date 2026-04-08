import logger from '../../../shared/utils/logger.js';

/** @typedef {import('../../../domain/repositories/interfaces/i-license-repository.js').ILicenseRepository} ILicenseRepository */
/** @typedef {{ id: string, email: string }} UserLike */

/**
 * Assign all licenses matching the user's email (via external_licenses linkage).
 * Failures are logged; does not throw (safe for post-create / idempotent verify).
 *
 * @param {ILicenseRepository} licenseRepository
 * @param {UserLike} user
 * @param {string} [logLabel]
 */
export async function autoAssignLicensesForUser(licenseRepository, user, logLabel = 'auto_assign') {
  if (!user?.email || !user?.id) {
    return;
  }
  try {
    const licenses = await licenseRepository.findAllByEmailLicense(user.email);
    await Promise.all(
      licenses.map(async (license) => {
        try {
          const alreadyAssigned = await licenseRepository.hasUserAssignment(license.id, user.id);
          if (alreadyAssigned) {
            return;
          }
          await licenseRepository.assignLicense({
            licenseId: license.id,
            userId: user.id,
            assignedBy: null,
          });
        } catch (assignError) {
          logger.warn('Auto-assign skipped for license', {
            logLabel,
            userId: user.id,
            licenseId: license.id,
            error: assignError.message,
          });
        }
      })
    );
  } catch (error) {
    logger.warn('Auto-assign licenses failed', {
      logLabel,
      userId: user.id,
      error: error.message,
    });
  }
}
