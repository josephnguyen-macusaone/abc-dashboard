'use client';

import { useState } from 'react';
import { useUser } from '@/presentation/contexts/user-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { User } from '@/application/dto/user-dto';
import { USER_ROLE_LABELS } from '@/shared/constants';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/atoms/ui/dialog';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/atoms/ui/avatar';
import { Badge } from '@/presentation/components/atoms/ui/badge';
import { Typography } from '@/presentation/components/atoms';

import { Trash2, AlertTriangle, UserX, Shield, Clock, Calendar, Mail } from 'lucide-react';

interface UserDeleteDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UserDeleteDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: UserDeleteDialogProps) {
  const { deleteUser, loading: { deleteUser: isDeleting } } = useUser();
  const { success, error } = useToast();
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    setIsDeletingUser(true);

    try {
      // Call API
      await deleteUser(user.id);

      // Close dialog
      onOpenChange(false);

      // Show success toast
      success?.('User deleted successfully');

      // Reset state
      setIsDeletingUser(false);

      // On success, trigger refresh
      onSuccess?.();

    } catch (err) {
      console.error('Error deleting user:', err);

      // Reset loading state
      setIsDeletingUser(false);

      // Show error toast
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';

      if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
        // Treat "not found" as success - the user is already deleted (idempotent operation)
        onOpenChange(false);
        success?.('User deleted successfully');
        onSuccess?.();
      } else if (errorMessage.includes('permission') || errorMessage.includes('Insufficient')) {
        error?.('You do not have permission to delete this user.');
        // Still refresh the list to show current state
        onSuccess?.();
      } else {
        error?.(`Failed to delete user: ${errorMessage}`);
        // Still refresh the list to show current state
        onSuccess?.();
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsDeletingUser(false);
  };

  if (!user) return null;

  const getUserInitials = (user: User) => {
    const displayName = user.displayName || user.email || 'U';
    return displayName
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = user.role === 'admin';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {/* Header with destructive styling */}
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-destructive">
                Delete User Account
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User Information Card */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-gradient-to-r from-muted/30 to-muted/10 p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div>
                  <Typography variant="title-s" className="font-semibold text-foreground" as="h3">
                    {user.displayName}
                  </Typography>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <Typography variant="body-s" color="muted" as="span">
                      {user.email}
                    </Typography>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      user.role === 'admin' ? 'destructive' :
                      user.role === 'manager' ? 'secondary' : 'default'
                    }
                    className="px-2 py-1"
                  >
                    {USER_ROLE_LABELS[user.role as keyof typeof USER_ROLE_LABELS] || user.role}
                  </Badge>

                  {user.role === 'admin' && (
                    <Badge variant="outline" className="px-2 py-1 border-red-200 text-red-700 dark:border-red-800 dark:text-red-400">
                      <Shield className="h-3 w-3 mr-1" />
                      Protected Admin
                    </Badge>
                  )}
                </div>

                {/* User stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {user.createdAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {user.lastLogin && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last login {new Date(user.lastLogin).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Warnings */}
          <div className="space-y-3">
            {isAdmin && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <strong>Critical Warning:</strong> This user has administrator privileges.
                  Deleting this account may affect system functionality and data access.
                </AlertDescription>
              </Alert>
            )}

            <Alert variant="destructive" className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Irreversible Action:</strong> All user data, settings, and associated content will be permanently removed.
                This includes profile information, preferences, and any linked resources.
              </AlertDescription>
            </Alert>
          </div>

        </div>

        {/* Footer with enhanced styling */}
        <DialogFooter className="gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeletingUser}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeletingUser}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-500"
          >
            {isDeletingUser ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Delete User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
