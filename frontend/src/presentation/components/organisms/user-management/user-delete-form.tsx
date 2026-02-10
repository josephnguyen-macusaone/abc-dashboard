'use client';

import { useState } from 'react';
import { useUser } from '@/presentation/contexts/user-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { User } from '@/application/dto/user-dto';
import { USER_ROLE_LABELS } from '@/shared/constants';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/atoms/primitives/dialog';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Alert, AlertDescription } from '@/presentation/components/atoms/primitives/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/atoms/primitives/avatar';
import { Badge } from '@/presentation/components/atoms/primitives/badge';
import { Typography } from '@/presentation/components/atoms';

import { Trash2, AlertTriangle, UserX, Shield, Clock, Calendar, Mail, ArrowLeft, Loader2 } from 'lucide-react';

interface UserDeleteFormProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UserDeleteForm({
  user,
  open,
  onOpenChange,
  onSuccess
}: UserDeleteFormProps) {
  const { deleteUser, loading: { deleteUser: isDeleting } } = useUser();
  const { success, error } = useToast();
  const { user: currentUser } = useAuthStore();
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
      // Reset loading state
      setIsDeletingUser(false);

      // Extract error details more thoroughly
      let errorMessage = 'Failed to delete user';
      let errorCode = '';
      let errorCategory = '';
      let errorDetails = '';

      if (err instanceof Error) {
        errorMessage = err.message;
        errorDetails = err.stack || '';
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as {
          message?: string; error?: string; code?: string; category?: string; details?: unknown;
          response?: { data?: { message?: string; error?: string; code?: string; category?: string } };
        };
        if (errorObj.message) errorMessage = errorObj.message;
        if (errorObj.error && typeof errorObj.error === 'string') errorMessage = errorObj.error;
        if (errorObj.code) errorCode = errorObj.code;
        if (errorObj.category) errorCategory = errorObj.category;
        if (errorObj.details) errorDetails = JSON.stringify(errorObj.details);
        if (errorObj.response?.data?.message) errorMessage = errorObj.response.data.message;
        if (errorObj.response?.data?.error) errorMessage = errorObj.response.data.error;
        if (errorObj.response?.data?.code) errorCode = errorObj.response.data.code;
        if (errorObj.response?.data?.category) errorCategory = errorObj.response.data.category;
      }

      // Handle specific error types with appropriate user messages
      if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND') || errorCode === 'USER_NOT_FOUND') {
        // Treat "not found" as success - the user is already deleted (idempotent operation)
        onOpenChange(false);
        success?.('User deleted successfully');
        onSuccess?.();
      } else if (errorCode === 'INSUFFICIENT_PERMISSIONS' || errorCategory === 'authorization' ||
        errorMessage.includes('permission') || errorMessage.includes('Insufficient') ||
        errorMessage.includes('cannot delete') || errorMessage.includes('Users cannot delete their own account') ||
        errorMessage.includes('Admin accounts cannot be deleted') ||
        errorMessage.includes('Managers cannot delete other managers')) {
        // Permission-related errors
        let permissionMessage = 'You do not have permission to delete this user';
        if (errorMessage.includes('Users cannot delete their own account')) {
          permissionMessage = 'You cannot delete your own account';
        } else if (errorMessage.includes('Admin accounts cannot be deleted')) {
          permissionMessage = 'Administrator accounts cannot be deleted';
        } else if (errorMessage.includes('Managers cannot delete other managers')) {
          permissionMessage = 'Managers cannot delete other manager accounts';
        } else if (errorMessage.includes('Managers cannot delete admin')) {
          permissionMessage = 'Managers cannot delete administrator accounts';
        }
        error?.(permissionMessage);
        // Still refresh the list to show current state
        onSuccess?.();
      } else if (errorCode === 'VALIDATION_FAILED' || errorCategory === 'validation') {
        // Generic validation errors
        error?.('Unable to delete user due to validation error. Please try again.');
        // Still refresh the list to show current state
        onSuccess?.();
      } else {
        // Unknown errors
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <Typography variant="body-m">Delete User Account</Typography>
              </DialogTitle>
              <DialogDescription>
                <Typography variant="label-m" color="muted">
                  This action is permanent and cannot be undone.
                </Typography>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User Information Card */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-linear-to-br from-muted/30 to-muted/10 p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage src={user.avatar} alt={user.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Typography variant="title-s" className="font-semibold text-foreground" as="h3">
                      {user.displayName}
                    </Typography>
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-body-s text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>

                {/* User stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {user.createdAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="text-body-s text-muted-foreground">Created {(() => {
                        const d = new Date(user.createdAt);
                        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
                      })()}</span>
                    </div>
                  )}
                  {user.lastLogin && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="text-body-s text-muted-foreground">Last login {(() => {
                        const d = new Date(user.lastLogin);
                        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
                      })()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Warnings */}
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription>
                <strong>Permanent Deletion:</strong> This action cannot be undone.
                All associated data, preferences, and user content will be completely removed.
              </AlertDescription>
            </Alert>
          </div>

        </div>

        {/* Footer with enhanced styling */}
        <DialogFooter className="gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeletingUser}
            className="flex-1"
          >
            <span className="text-button-s">Cancel</span>
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeletingUser}
            className="flex-1"
          >
            {isDeletingUser ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-button-s">Deleting...</span>
              </>
            ) : (
              <>
                <UserX className="h-4 w-4" />
                <span className="text-button-s">Delete User</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
