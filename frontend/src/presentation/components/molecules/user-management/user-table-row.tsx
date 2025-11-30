'use client';

import { Button, RoleBadge, Typography } from '@/presentation/components/atoms';
import { Badge } from '@/presentation/components/atoms/ui/badge';
import { type User } from '@/domain/entities/user-entity';
import { Edit, Trash2, Lock, User2 } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface UserTableRowProps {
  user: User;
  currentUser: User;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onChangePassword?: (user: User) => void;
  className?: string;
}

export function UserTableRow({
  user,
  currentUser,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onChangePassword,
  className,
}: UserTableRowProps) {
  console.log('UserTableRow rendering for user:', user.username || user.id, 'canEdit:', canEdit, 'canDelete:', canDelete);

  // Get display name - use displayName, then name, then id
  const displayName = user.displayName || user.name || user.username || user.id;

  return (
    <tr className={cn('transition-colors duration-150 hover:bg-muted/50 group', className)}>
      <td className="p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
              <User2 className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <Typography variant="body-s" className="text-foreground block truncate">
              {displayName}
            </Typography>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center space-x-2">
          <RoleBadge role={user.role} />
        </div>
      </td>
      <td className="p-4">
        <Badge
          variant={user.isActive ? 'default' : 'secondary'}
          className={cn(
            'px-2 py-1',
            user.isActive
              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
              : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
          )}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="p-4">
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

          {onChangePassword && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChangePassword(user)}
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-colors"
              title="Change password"
            >
              <Lock className="h-4 w-4" />
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
      </td>
    </tr>
  );
}