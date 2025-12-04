/**
 * UI/UX related constants
 */

import type { ColumnDefinition } from '@/shared/types';

/**
 * Theme Options
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

/**
 * User Table Column Definitions
 */
export const userColumns: ColumnDefinition[] = [
  { key: 'displayName', label: 'User', visible: true, sortable: true, width: '200px' },
  { key: 'email', label: 'Email', visible: true, sortable: true, width: '250px' },
  { key: 'phone', label: 'Phone', visible: true, sortable: false, width: '130px' },
  { key: 'role', label: 'Role', visible: true, sortable: true, width: '100px', align: 'center' },
  { key: 'isActive', label: 'Status', visible: true, sortable: true, width: '100px', align: 'center' },
  { key: 'createdAt', label: 'Created At', visible: true, sortable: true, width: '130px' },
  { key: 'actions', label: 'Actions', visible: true, sortable: false, width: '100px', align: 'right' },
];

export const defaultUserVisibleColumns = userColumns.map(col => col.key);