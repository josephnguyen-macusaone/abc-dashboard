/**
 * User Management Constants
 */

/**
 * Single source of truth for user table/grid column widths.
 * Used by user-table-columns (data table). Use in any future user grid as well.
 * Edit this file to resize columns in all user views.
 */
export const USER_COLUMN_WIDTHS = {
  displayName: { size: 280, minSize: 180 },
  username: { size: 220, minSize: 140 },
  email: { size: 240, minSize: 180 },
  phone: { size: 160, minSize: 120 },
  role: { size: 160, minSize: 130 },
  isActive: { size: 140, minSize: 120 },
  createdAt: { size: 140, minSize: 120 },
  actions: { size: 52, minSize: 44 },
} as const;

export type UserColumnId = keyof typeof USER_COLUMN_WIDTHS;
