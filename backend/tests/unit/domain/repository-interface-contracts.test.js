import { describe, it, expect } from '@jest/globals';

import { UserRepository } from '../../../src/infrastructure/repositories/user-repository.js';
import { LicenseRepository } from '../../../src/infrastructure/repositories/license-repository.js';
import { ExternalLicenseRepository } from '../../../src/infrastructure/repositories/external-license-repository.js';

function expectOwnMethods(klass, methods) {
  const proto = klass.prototype;
  for (const methodName of methods) {
    expect(Object.prototype.hasOwnProperty.call(proto, methodName)).toBe(true);
    expect(typeof proto[methodName]).toBe('function');
  }
}

describe('repository interface contract coverage', () => {
  it('UserRepository implements auth refresh-token contract methods', () => {
    expectOwnMethods(UserRepository, [
      'storeRefreshToken',
      'findRefreshToken',
      'revokeRefreshToken',
      'revokeAllUserRefreshTokens',
      'cleanExpiredRefreshTokens',
    ]);
  });

  it('LicenseRepository implements lifecycle/metrics contract methods', () => {
    expectOwnMethods(LicenseRepository, [
      'getDashboardAggregates',
      'updateWithExpectedUpdatedAt',
      'findLicensesNeedingReminders',
      'updateRenewalReminders',
      'addRenewalHistory',
      'findExpiredLicensesForSuspension',
      'suspendExpiredLicenses',
      'extendLicenseExpiration',
      'reactivateLicense',
      'getAllAgentNames',
      'findByAppId',
      'findByCountId',
    ]);
  });

  it('ExternalLicenseRepository implements sync contract methods', () => {
    expectOwnMethods(ExternalLicenseRepository, [
      'save',
      'findByAppIds',
      'countAll',
      'getLicenseStatsWithFilters',
      'getLastSyncTimestamp',
      'updateSyncState',
      'recordSyncFailures',
      'syncFromInternalLicenses',
      'syncToInternalLicenses',
    ]);
  });
});
