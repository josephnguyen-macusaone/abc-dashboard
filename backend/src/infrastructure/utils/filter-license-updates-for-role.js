import { ROLES } from '../../shared/constants/roles.js';

/** Internal API field names (camelCase) managers may change for agent assignment */
const MANAGER_LICENSE_PATCH_FIELDS = new Set([
  'agents',
  'agentsName',
  'expectedUpdatedAt',
  'updatedAt',
]);

/**
 * Restrict license PATCH body for line managers (agent managers) to agent assignment fields only.
 * @param {string|undefined} role
 * @param {Record<string, unknown>|null|undefined} body
 * @returns {Record<string, unknown>}
 */
export function filterLicenseBodyForRole(role, body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  if (role !== ROLES.MANAGER) {
    return { ...body };
  }
  const out = {};
  for (const key of Object.keys(body)) {
    if (MANAGER_LICENSE_PATCH_FIELDS.has(key)) {
      out[key] = body[key];
    }
  }
  return out;
}
