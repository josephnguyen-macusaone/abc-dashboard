'use client';

import { useState } from 'react';
import { userApi } from '@/infrastructure/api/users';
import { UserProfile } from '@/infrastructure/api/types';
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
import { Loading } from '@/presentation/components/atoms/display/loading';
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/atoms/ui/avatar';
import { Badge } from '@/presentation/components/atoms/ui/badge';

import { Trash2, AlertTriangle, UserX, Shield, Check } from 'lucide-react';

interface UserDeleteDialogProps {
  user: UserProfile | null;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDelete = async () => {
    if (!user) return;

    // Check confirmation text
    const expectedText = `delete-${user.username}`;
    if (confirmText.toLowerCase() !== expectedText.toLowerCase()) {
      setError('Please type the confirmation text exactly as shown');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await userApi.deleteUser(user.id);

      setSuccess(true);
      onSuccess?.();

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setConfirmText('');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      console.error('Error deleting user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setError(null);
      setConfirmText('');
      setSuccess(false);
    }
  };

  if (!user) return null;

  const getUserInitials = (user: UserProfile) => {
    return user.displayName
      .split(' ')
      .map(name => name.charAt(0))
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
            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user.displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
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

        {/* Success Message */}
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <Check className="h-4 w-4" />
            <AlertDescription>
              User has been successfully deleted.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && !success && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Confirmation Input */}
        {!success && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <code className="bg-muted px-1 py-0.5 rounded text-xs">delete-{user.username}</code> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder={`delete-${user.username}`}
              disabled={loading}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || confirmText !== `delete-${user.username}`}
            >
              {loading ? (
                <>
                  <Loading className="h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
