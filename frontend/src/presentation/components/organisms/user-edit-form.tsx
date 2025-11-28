'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userApi } from '@/infrastructure/api/users';
import { UserProfile, UpdateUserRequest } from '@/infrastructure/api/types';
import { USER_ROLES, USER_ROLE_LABELS } from '@/shared/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Input } from '@/presentation/components/atoms/forms/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/ui/select';
import { FormField } from '@/presentation/components/molecules/form/form-field';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { Loading } from '@/presentation/components/atoms/display/loading';

import { Edit, X, Check, AlertCircle } from 'lucide-react';

// Validation schema for updates (all fields optional)
const updateUserSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name cannot exceed 100 characters')
    .optional(),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val), {
      message: 'Phone number must be in valid format'
    }),
  role: z.enum(['admin', 'manager', 'staff']).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => {
  // At least one field must be provided
  return Object.values(data).some(value =>
    value !== undefined && value !== null && value !== ''
  );
}, {
  message: 'At least one field must be updated'
});

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

interface UserEditFormProps {
  user: UserProfile;
  onSuccess?: (user: UserProfile) => void;
  onCancel?: () => void;
}

export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [updatedUser, setUpdatedUser] = useState<UserProfile | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      displayName: user.displayName,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
    }
  });

  const selectedRole = watch('role');
  const isActive = watch('isActive');

  const onSubmit = async (data: UpdateUserFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Only include fields that have changed
      const updates: UpdateUserRequest = {};

      if (data.displayName !== undefined && data.displayName !== user.displayName) {
        updates.displayName = data.displayName;
      }

      if (data.phone !== undefined && data.phone !== (user.phone || '')) {
        updates.phone = data.phone || undefined;
      }

      if (data.role !== undefined && data.role !== user.role) {
        updates.role = data.role;
      }

      if (data.isActive !== undefined && data.isActive !== user.isActive) {
        updates.isActive = data.isActive;
      }

      // Only proceed if there are actual changes
      if (Object.keys(updates).length === 0) {
        setError('No changes detected');
        return;
      }

      const response = await userApi.updateUser(user.id, updates);

      setUpdatedUser(response.user);
      setSuccess(true);

      // Call success callback
      onSuccess?.(response.user);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success && updatedUser) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            User Updated Successfully
          </CardTitle>
          <CardDescription>
            The user's information has been updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span>
                <p>{updatedUser.displayName}</p>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <p>{updatedUser.email}</p>
              </div>
              <div>
                <span className="font-medium">Role:</span>
                <p className="capitalize">{USER_ROLE_LABELS[updatedUser.role as keyof typeof USER_ROLE_LABELS] || updatedUser.role}</p>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <p>{updatedUser.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit User
        </CardTitle>
        <CardDescription>
          Update user information and permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* User Info Display */}
        <div className="bg-muted p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Username:</span>
              <p className="text-muted-foreground">{user.username}</p>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <span className="font-medium">Created:</span>
              <p className="text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>
              <p className="text-muted-foreground">
                {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display Name */}
            <FormField
              label="Display Name"
              error={errors.displayName?.message}
            >
              <Input
                {...register('displayName')}
                placeholder="Enter display name"
                className={errors.displayName ? 'border-destructive' : ''}
              />
            </FormField>

            {/* Phone */}
            <FormField
              label="Phone Number"
              error={errors.phone?.message}
            >
              <Input
                {...register('phone')}
                placeholder="Enter phone number"
                className={errors.phone ? 'border-destructive' : ''}
              />
            </FormField>

            {/* Role */}
            <FormField
              label="Role"
              error={errors.role?.message}
            >
              <Select
                value={selectedRole}
                onValueChange={(value: 'admin' | 'manager' | 'staff') => setValue('role', value)}
              >
                <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <span>Staff</span>
                      <span className="text-xs text-muted-foreground">Basic user access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <span>Manager</span>
                      <span className="text-xs text-muted-foreground">Team management access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <span>Administrator</span>
                      <span className="text-xs text-muted-foreground">Full system access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Status */}
            <FormField label="Status">
              <Select
                value={isActive ? 'active' : 'inactive'}
                onValueChange={(value: string) => setValue('isActive', value === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loading className="h-4 w-4 mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update User
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
