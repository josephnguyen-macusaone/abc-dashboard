/**
 * User list `meta.stats` from the API may omit keys (older servers) or use legacy role keys.
 * Always produce complete numeric counts for the UI.
 */
export interface UserListStats {
  total: number;
  admin: number;
  accountant: number;
  manager: number;
  tech: number;
  agent: number;
}

const ZERO_STATS: UserListStats = {
  total: 0,
  admin: 0,
  accountant: 0,
  manager: 0,
  tech: 0,
  agent: 0,
};

function readCount(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

export function normalizeUserStats(raw: unknown): UserListStats {
  if (!raw || typeof raw !== 'object') {
    return { ...ZERO_STATS };
  }

  const r = raw as Record<string, unknown>;
  const legacyManager = readCount(r, 'manager');
  const legacyTypedManagers =
    readCount(r, 'account_manager', 'accountManager') +
    readCount(r, 'tech_manager', 'techManager') +
    readCount(r, 'agent_manager', 'agentManager');

  return {
    total: readCount(r, 'total'),
    admin: readCount(r, 'admin'),
    accountant: readCount(r, 'accountant'),
    manager: legacyManager + legacyTypedManagers,
    tech: readCount(r, 'tech'),
    agent: readCount(r, 'agent'),
  };
}
