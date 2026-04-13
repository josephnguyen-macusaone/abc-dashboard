/**
 * License table/grid layout: sort default, persistence keys, column defaults, widths.
 */

/** Default sort for license data table and data grid (Activate Date, newest first) */
export const DEFAULT_LICENSE_SORT = [{ id: 'startsAt', desc: true }] as const;

/** localStorage key for license data table column visibility (staff / admin). */
export const LICENSE_DATA_TABLE_COLUMN_VISIBILITY_KEY = 'licenses-data-table-column-visibility';

/** Separate key so agent column prefs do not overwrite staff defaults. */
export const LICENSE_DATA_TABLE_AGENT_COLUMN_VISIBILITY_KEY = 'licenses-data-table-column-visibility-agent';

/** Separate keys for Tech / Accountant dashboard table defaults. */
export const LICENSE_DATA_TABLE_TECH_COLUMN_VISIBILITY_KEY = 'licenses-data-table-column-visibility-tech';
export const LICENSE_DATA_TABLE_ACCOUNTANT_COLUMN_VISIBILITY_KEY =
  'licenses-data-table-column-visibility-accountant';

/**
 * Agent dashboard: show core list fields only; SMS / agents / notes / audit off by default
 * (users enable via column visibility). Aligns with a lean default list UX.
 */
export const AGENT_LICENSE_TABLE_INITIAL_COLUMN_VISIBILITY: Record<string, boolean> = {
  select: false,
  dba: true,
  zip: true,
  startsAt: true,
  status: true,
  plan: true,
  term: true,
  dueDate: true,
  lastPayment: true,
  lastActive: true,
  smsPurchased: false,
  smsSent: false,
  smsBalance: false,
  agents: false,
  agentsName: false,
  agentsCost: false,
  notes: false,
  createdBy: false,
  updatedBy: false,
  auditHistory: false,
};

/**
 * Tech dashboard: dates, status, plan, agent context; light on SMS $ columns (edits live in License Management).
 */
export const TECH_LICENSE_TABLE_INITIAL_COLUMN_VISIBILITY: Record<string, boolean> = {
  select: false,
  dba: true,
  zip: true,
  startsAt: true,
  status: true,
  plan: true,
  term: true,
  dueDate: true,
  lastPayment: false,
  lastActive: true,
  smsPurchased: false,
  smsSent: false,
  smsBalance: false,
  agents: true,
  agentsName: true,
  agentsCost: false,
  notes: false,
  createdBy: true,
  updatedBy: true,
  auditHistory: false,
};

/**
 * Accountant dashboard: financial + SMS + package-relevant columns by default.
 */
export const ACCOUNTANT_LICENSE_TABLE_INITIAL_COLUMN_VISIBILITY: Record<string, boolean> = {
  select: false,
  dba: true,
  zip: true,
  startsAt: true,
  status: true,
  plan: true,
  term: true,
  dueDate: true,
  lastPayment: true,
  lastActive: true,
  smsPurchased: true,
  smsSent: true,
  smsBalance: true,
  agents: true,
  agentsName: true,
  agentsCost: true,
  notes: true,
  createdBy: true,
  updatedBy: true,
  auditHistory: false,
};

/**
 * Single source of truth for license table/grid column widths.
 * Used by license-table-columns (data table) and license-grid-columns (data grid).
 */
export const LICENSE_COLUMN_WIDTHS = {
  select: { size: 48, minSize: 40 },
  /** Primary column: widest default + stretch in grid / absorb slack in table when fillContainer. */
  dba: { size: 360, minSize: 220 },
  /** Zip + dates: end-aligned; widths fit MM/DD/YYYY comfortably. */
  zip: { size: 132, minSize: 96 },
  startsAt: { size: 168, minSize: 128 },
  /** Status / plan / term: wider for filter chips and multi-module plan text (plan wider than zip). */
  status: { size: 156, minSize: 100 },
  plan: { size: 220, minSize: 140 },
  term: { size: 148, minSize: 100 },
  dueDate: { size: 168, minSize: 128 },
  lastPayment: { size: 144, minSize: 100 },
  lastActive: { size: 168, minSize: 128 },
  smsPurchased: { size: 170, minSize: 130 },
  smsSent: { size: 150, minSize: 100 },
  smsBalance: { size: 160, minSize: 120 },
  agents: { size: 280, minSize: 130 },
  agentsName: { size: 280, minSize: 130 },
  agentsCost: { size: 160, minSize: 120 },
  notes: { size: 300, minSize: 100 },
  createdBy: { size: 160, minSize: 100 },
  updatedBy: { size: 160, minSize: 100 },
  auditHistory: { size: 52, minSize: 44 },
} as const;

export type LicenseColumnId = keyof typeof LICENSE_COLUMN_WIDTHS;
