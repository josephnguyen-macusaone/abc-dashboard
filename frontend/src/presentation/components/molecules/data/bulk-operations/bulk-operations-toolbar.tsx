'use client';

import * as React from 'react';
import { Trash2, UserCheck, UserX, Users, Download, X } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Separator } from '@/presentation/components/atoms/primitives/separator';
import { Typography } from '@/presentation/components/atoms/display/typography';
import { Badge } from '@/presentation/components/atoms/primitives/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/atoms/primitives/dropdown-menu';
import { cn, logger } from '@/shared/helpers';

const log = logger.createChild({ component: 'BulkOperationsToolbar' });

// ============================================================================
// Types
// ============================================================================

export interface BulkOperation {
  /** Unique operation identifier */
  id: string;

  /** Display label */
  label: string;

  /** Operation description */
  description?: string;

  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;

  /** Callback when operation is triggered */
  onExecute: (selectedIds: string[]) => void | Promise<void>;

  /** Whether operation is destructive (shows in red) */
  destructive?: boolean;

  /** Whether operation is disabled */
  disabled?: boolean;

  /** Requires confirmation dialog */
  requiresConfirmation?: boolean;

  /** Confirmation message */
  confirmationMessage?: string;
}

export interface BulkOperationsToolbarProps {
  /** Currently selected item IDs */
  selectedIds: string[];

  /** Total number of items in the current view/filter */
  totalItems: number;

  /** Available bulk operations */
  operations: BulkOperation[];

  /** Callback to clear selection */
  onClearSelection: () => void;

  /** Optional class name */
  className?: string;

  /** Entity name for display (e.g., "users", "licenses") */
  entityName?: string;

  /** Whether any operation is currently executing */
  isExecuting?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function BulkOperationsToolbar({
  selectedIds,
  totalItems,
  operations,
  onClearSelection,
  className,
  entityName = 'items',
  isExecuting = false,
}: BulkOperationsToolbarProps) {
  const selectedCount = selectedIds.length;

  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null;
  }

  const handleOperation = React.useCallback(
    async (operation: BulkOperation) => {
      if (operation.disabled || isExecuting) return;

      // Handle confirmation if required
      if (operation.requiresConfirmation) {
        const message =
          operation.confirmationMessage ||
          `Are you sure you want to ${operation.label.toLowerCase()} ${selectedCount} ${entityName}?`;

        if (!window.confirm(message)) {
          return;
        }
      }

      try {
        await operation.onExecute(selectedIds);
      } catch (error) {
        log.error(`Bulk operation ${operation.id} failed`, { operationId: operation.id, error });
        // Error handling should be done in the operation callback
      }
    },
    [selectedIds, selectedCount, entityName, isExecuting]
  );

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-background border rounded-lg shadow-lg',
        'flex items-center gap-3 px-4 py-3',
        'animate-in slide-in-from-bottom-5 duration-200',
        className
      )}
    >
      {/* Selection Info */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
          {selectedCount} selected
        </Badge>
        {totalItems > 0 && (
          <Typography variant="body-s" className="text-muted-foreground">
            of {totalItems} {entityName}
          </Typography>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Bulk Operations */}
      <div className="flex items-center gap-2">
        {operations.length <= 3 ? (
          // Show as buttons if 3 or fewer operations
          operations.map((operation) => {
            const Icon = operation.icon;
            return (
              <Button
                key={operation.id}
                variant={operation.destructive ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleOperation(operation)}
                disabled={operation.disabled || isExecuting}
                className="gap-2"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {operation.label}
              </Button>
            );
          })
        ) : (
          // Show as dropdown if more than 3 operations
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExecuting}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Actions ({operations.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              {operations.map((operation, index) => {
                const Icon = operation.icon;
                const isLastBeforeDestructive =
                  !operation.destructive &&
                  operations[index + 1]?.destructive;

                return (
                  <React.Fragment key={operation.id}>
                    <DropdownMenuItem
                      onClick={() => handleOperation(operation)}
                      disabled={operation.disabled || isExecuting}
                      className={cn(
                        'cursor-pointer',
                        operation.destructive && 'text-destructive focus:text-destructive'
                      )}
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      <div className="flex flex-col">
                        <span className="font-medium">{operation.label}</span>
                        {operation.description && (
                          <span className="text-xs text-muted-foreground">
                            {operation.description}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                    {isLastBeforeDestructive && <DropdownMenuSeparator />}
                  </React.Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Clear Selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        disabled={isExecuting}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        Clear
      </Button>

      {/* Loading Indicator */}
      {isExecuting && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <Typography variant="body-s" className="text-muted-foreground">
              Processing...
            </Typography>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Predefined Operations
// ============================================================================

/**
 * Common bulk operations for user management
 */
export const USER_BULK_OPERATIONS = {
  activate: (onSuccess?: () => void): BulkOperation => ({
    id: 'activate',
    label: 'Activate',
    description: 'Activate selected users',
    icon: UserCheck,
    onExecute: async (ids) => {
      log.debug('Activating users', { ids });
      onSuccess?.();
    },
  }),

  deactivate: (onSuccess?: () => void): BulkOperation => ({
    id: 'deactivate',
    label: 'Deactivate',
    description: 'Deactivate selected users',
    icon: UserX,
    onExecute: async (ids) => {
      log.debug('Deactivating users', { ids });
      onSuccess?.();
    },
  }),

  delete: (onSuccess?: () => void): BulkOperation => ({
    id: 'delete',
    label: 'Delete',
    description: 'Permanently delete selected users',
    icon: Trash2,
    destructive: true,
    requiresConfirmation: true,
    confirmationMessage:
      'Are you sure you want to delete these users? This action cannot be undone.',
    onExecute: async (ids) => {
      log.debug('Deleting users', { ids });
      onSuccess?.();
    },
  }),

  export: (onSuccess?: () => void): BulkOperation => ({
    id: 'export',
    label: 'Export',
    description: 'Export selected users to CSV',
    icon: Download,
    onExecute: async (ids) => {
      log.debug('Exporting users', { ids });
      onSuccess?.();
    },
  }),
};

/**
 * Common bulk operations for license management
 */
export const LICENSE_BULK_OPERATIONS = {
  activate: (onSuccess?: () => void): BulkOperation => ({
    id: 'activate',
    label: 'Activate',
    description: 'Activate selected licenses',
    icon: UserCheck,
    onExecute: async (ids) => {
      log.debug('Activating licenses', { ids });
      onSuccess?.();
    },
  }),

  cancel: (onSuccess?: () => void): BulkOperation => ({
    id: 'cancel',
    label: 'Cancel',
    description: 'Cancel selected licenses',
    icon: UserX,
    requiresConfirmation: true,
    onExecute: async (ids) => {
      log.debug('Canceling licenses', { ids });
      onSuccess?.();
    },
  }),

  delete: (onSuccess?: () => void): BulkOperation => ({
    id: 'delete',
    label: 'Delete',
    description: 'Permanently delete selected licenses',
    icon: Trash2,
    destructive: true,
    requiresConfirmation: true,
    confirmationMessage:
      'Are you sure you want to delete these licenses? This action cannot be undone.',
    onExecute: async (ids) => {
      log.debug('Deleting licenses', { ids });
      onSuccess?.();
    },
  }),

  export: (onSuccess?: () => void): BulkOperation => ({
    id: 'export',
    label: 'Export',
    description: 'Export selected licenses to CSV',
    icon: Download,
    onExecute: async (ids) => {
      log.debug('Exporting licenses', { ids });
      onSuccess?.();
    },
  }),
};
