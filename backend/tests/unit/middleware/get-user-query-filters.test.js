import { describe, expect, it } from '@jest/globals';
import { getUserQueryFilters } from '../../../src/infrastructure/middleware/user-management.middleware.js';
import { ROLES } from '../../../src/shared/constants/roles.js';

describe('getUserQueryFilters', () => {
  it('returns excludeRoles admin for managers', () => {
    expect(getUserQueryFilters({ id: 'm1', role: ROLES.MANAGER }, {})).toEqual({
      excludeRoles: [ROLES.ADMIN],
    });
  });

  it('does not exclude roles for admin', () => {
    expect(getUserQueryFilters({ id: 'a1', role: ROLES.ADMIN }, {})).toEqual({});
  });

  it('does not exclude roles for accountant', () => {
    expect(getUserQueryFilters({ id: 'c1', role: ROLES.ACCOUNTANT }, {})).toEqual({});
  });
});
