'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue , Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/presentation/components/atoms';
import { ROLE_DEFINITIONS, PermissionUtils, type UserRoleType } from '@/shared/constants';
import { type User, UserRole } from '@/domain/entities/user-entity';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '@/shared/utils';
import { useAuth } from '@/presentation/contexts/auth-context';

export interface UserFormModalProps {
  title: string;
  user?: User;
  onSubmit: (user: Partial<User>) => Promise<void>;
  onClose: () => void;
  loading: boolean;
  open: boolean;
  passwordOnly?: boolean; // If true, only show password fields
}

export function UserFormModal({
  title,
  user,
  onSubmit,
  onClose,
  loading,
  open,
  passwordOnly = false,
}: UserFormModalProps) {
  const { user: currentUser } = useAuth();

  // Get available roles based on current user's role creation permissions
  // - Admin: can create admin, manager, staff
  // - Manager: can only create staff
  // - Staff: cannot create any users
  const getAvailableRoles = () => {
    const creatableRoles = PermissionUtils.getCreatableRoles(currentUser?.role);
    return creatableRoles.map((role: UserRoleType) => ({
      value: role,
      label: ROLE_DEFINITIONS[role]?.displayName || role,
    }));
  };

  const availableRoles = getAvailableRoles();
  const defaultRole = availableRoles.length > 0 ? availableRoles[availableRoles.length - 1].value : UserRole.STAFF;

  const [formData, setFormData] = useState<{
    username: string;
    role: UserRole;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>({
    username: '', // No longer needed for creation - auto-generated from email
    role: (user?.role as UserRole) || defaultRole as UserRole,
    oldPassword: '', // Old password for verification when editing
    newPassword: '', // New password when editing
    confirmPassword: '', // Confirm new password when editing
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Reset form data when user changes or modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        username: user?.username || '', // Only for editing existing users
        role: (user?.role as UserRole) || defaultRole as UserRole,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [user, open, defaultRole]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (user) {
      // When editing, validate password fields
      if (formData.newPassword.trim() || formData.confirmPassword.trim() || formData.oldPassword.trim()) {
        // If any password field is filled, all must be filled
        if (!formData.oldPassword.trim()) {
          newErrors.oldPassword = 'Current password is required';
        }
        if (!formData.newPassword.trim()) {
          newErrors.newPassword = 'New password is required';
        }
        if (!formData.confirmPassword.trim()) {
          newErrors.confirmPassword = 'Please confirm your new password';
        }

        // Validate password match
        if (formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }

        // Validate password length
        if (formData.newPassword && formData.newPassword.length < 8) {
          newErrors.newPassword = 'Password must be at least 8 characters';
        }
      }
    } else {
      // When creating, username is required
      if (!formData.username.trim()) {
        // This is handled by required attribute
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // When editing (user exists), send password fields
    if (user) {
      // Only submit if password fields are filled
      if (formData.oldPassword.trim() || formData.newPassword.trim() || formData.confirmPassword.trim()) {
        const submitData: Partial<User> = {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        } as any;
        await onSubmit(submitData);
      } else {
        // No password change requested
        return;
      }
    } else {
      // When creating, send role only (username auto-generated from email)
      await onSubmit({
        role: formData.role,
      });
    }
    // Reset form after successful submit
    if (!user) {
      setFormData({
        username: '', // Keep empty for creation
        role: defaultRole as UserRole,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } else {
      // Reset password fields after successful edit
      setFormData(prev => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Role field - compact layout with one field per line */}
          {!passwordOnly && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Role
              </label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
                disabled={!!user || availableRoles.length === 0}
              >
                <SelectTrigger className={user ? 'bg-muted cursor-not-allowed' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user && (
                <p className="text-xs text-muted-foreground mt-1">
                  Role cannot be changed after user creation
                </p>
              )}
              {!user && availableRoles.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  You do not have permission to create users
                </p>
              )}
          </div>
          )}

          {/* Password fields - show when editing or when passwordOnly is true */}
          {(user || passwordOnly) && (
            <>
              {/* Old Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Current Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showOldPassword ? 'text' : 'password'}
                    value={formData.oldPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, oldPassword: e.target.value }));
                      if (errors.oldPassword) {
                        setErrors(prev => ({ ...prev, oldPassword: undefined }));
                      }
                    }}
                    placeholder="Enter current password"
                    className={cn(
                      'pl-10 pr-10',
                      errors.oldPassword && 'border-destructive focus:border-destructive'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.oldPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.oldPassword}</p>
                )}
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, newPassword: e.target.value }));
                      if (errors.newPassword) {
                        setErrors(prev => ({ ...prev, newPassword: undefined }));
                      }
                      // Clear confirm password error if passwords now match
                      if (formData.confirmPassword && e.target.value === formData.confirmPassword && errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Enter new password"
                    className={cn(
                      'pl-10 pr-10',
                      errors.newPassword && 'border-destructive focus:border-destructive'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.newPassword}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Password must be at least 8 characters
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Confirm New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Confirm new password"
                    className={cn(
                      'pl-10 pr-10',
                      errors.confirmPassword && 'border-destructive focus:border-destructive'
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}