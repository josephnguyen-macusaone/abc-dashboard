'use client';

import { Button, Typography } from '@/presentation/components/atoms';
import { RoleBadge, StatusBadge } from '@/presentation/components/molecules/domain/user-management';
import { TableCell, TableRow } from '@/presentation/components/atoms/primitives/table';
import { type User } from '@/domain/entities/user-entity';
import { Edit, Trash2, User2 } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface UserTableRowProps {
  user: User;
  currentUser: User;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  className?: string;
}

export function UserTableRow({
  user,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  className,
}: UserTableRowProps) {
  // Get display name - use displayName, then name, then id
  const displayName = user.displayName || user.name || user.username || user.id;

  return (
    <TableRow className={cn('group', className)}>
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-linear-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
              <User2 className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Typography variant="body-s" className="text-foreground block truncate">
              {displayName}
            </Typography>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Typography variant="body-s" className="text-muted-foreground truncate">
          {user.email}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body-s" className="text-muted-foreground">
          {user.phone || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <RoleBadge role={user.role} />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge isActive={user.isActive} />
      </TableCell>
      <TableCell>
        <Typography variant="body-s" className="text-muted-foreground">
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : 'N/A'}
        </Typography>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-1.5">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(user)}
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
              title="Edit user"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}

          {canDelete && user.id !== currentUser.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title={`Delete user ${displayName}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}