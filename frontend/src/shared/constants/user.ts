/**
 * User Management Constants
 */

/**
 * Single source of truth for user table/grid column widths.
 * Used by user-table-columns (data table). Use in any future user grid as well.
 * Edit this file to resize columns in all user views.
 */
export const USER_COLUMN_WIDTHS = {
  displayName: { size: 280 },
  username: { size: 220 },
  email: { size: 120 },
  phone: { size: 140 },
  role: { size: 140 },
  isActive: { size: 140 },
  createdAt: { size: 120 },
  actions: { size: 52, minSize: 44 },
} as const;

export type UserColumnId = keyof typeof USER_COLUMN_WIDTHS;
