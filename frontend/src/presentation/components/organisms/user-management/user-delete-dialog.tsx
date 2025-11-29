'use client';

import { useState } from 'react';
import { useUserManagementService } from '@/presentation/hooks/use-user-management-service';
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

import { Trash2, AlertTriangle, UserX, Shield } from 'lucide-react';
import { toast } from '@/presentation/components/atoms';

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
  const userManagementService = useUserManagementService();

  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    // Close dialog immediately
    onOpenChange(false);

    try {
      // Call API after dialog is closed
      await userManagementService.deleteUser(user.id);

      // Show success toast
      toast.success('User deleted successfully');

      // On success, trigger refresh
      onSuccess?.();

    } catch (err) {
      console.error('Error deleting user:', err);

      // Show error toast since dialog is already closed
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';

      if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
        // Treat "not found" as success - the user is already deleted (idempotent operation)
        toast.success('User deleted successfully');
        onSuccess?.();
      } else if (errorMessage.includes('permission') || errorMessage.includes('Insufficient')) {
        toast.error('You do not have permission to delete this user.');
        // Still refresh the list to show current state
        onSuccess?.();
      } else {
        toast.error(`Failed to delete user: ${errorMessage}`);
        // Still refresh the list to show current state
        onSuccess?.();
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user account and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {/* MAC USA ONE Typography: Body M for user name */}
            <Typography variant="body-m" className="font-medium truncate" as="p">
              {user.displayName}
            </Typography>
            {/* MAC USA ONE Typography: Body S for email */}
            <Typography variant="body-s" color="muted" className="truncate" as="p">
              {user.email}
            </Typography>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  user.role === 'admin' ? 'destructive' :
                  user.role === 'manager' ? 'secondary' : 'default'
                }
                className="text-xs"
              >
                {USER_ROLE_LABELS[user.role as keyof typeof USER_ROLE_LABELS] || user.role}
              </Badge>
              {user.role === 'admin' && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Protected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Warning for admin users */}
        {isAdmin && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This user has administrator privileges.
              Deleting admin accounts may affect system functionality.
            </AlertDescription>
          </Alert>
        )}



        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <UserX className="h-4 w-4 mr-2" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
