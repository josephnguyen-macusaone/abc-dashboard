/**
 * User Management Constants
 */

/**
 * Single source of truth for user table/grid column widths.
 * Used by user-table-columns (data table). Use in any future user grid as well.
 * Edit this file to resize columns in all user views.
 */
export const USER_COLUMN_WIDTHS = {
  displayName: { size: 200 },
  username: { size: 150 },
  email: { size: 200 },
  phone: { size: 140 },
  role: { size: 150 },
  isActive: { size: 100 },
  createdAt: { size: 120 },
  actions: { size: 70 },
} as const;

export type UserColumnId = keyof typeof USER_COLUMN_WIDTHS;
