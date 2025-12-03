'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/presentation/contexts/user-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { User, UpdateUserDTO } from '@/application/dto/user-dto';
import { UserRole } from '@/domain/entities/user-entity';
import { USER_ROLE_LABELS, USER_ROLES } from '@/shared/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/primitives/card';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Input } from '@/presentation/components/atoms/forms/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/forms/select';
import { FormField, InputField } from '@/presentation/components/molecules';
import { Loading } from '@/presentation/components/atoms/display/loading';
import { Typography } from '@/presentation/components/atoms';

import { Edit, X, Check, ArrowLeft } from 'lucide-react';

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
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.STAFF]).optional(),
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
  user: User;
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
  const { updateUser, loading: { updateUser: isUpdating }, error: { updateUser: updateError } } = useUser();
  const { success: showSuccess, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
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
      // Only include fields that have changed
      const updates: UpdateUserDTO = {};

      if (data.displayName !== undefined && data.displayName !== user.displayName) {
        updates.displayName = data.displayName;
      }

      if (data.phone !== undefined && data.phone !== (user.phone || '')) {
        updates.phone = data.phone || undefined;
      }

      if (data.role !== undefined && data.role !== user.role) {
        updates.role = data.role as UserRole;
      }

      if (data.isActive !== undefined && data.isActive !== user.isActive) {
        updates.isActive = data.isActive;
      }

      // Only proceed if there are actual changes
      if (Object.keys(updates).length === 0) {
        // No changes detected - this will be handled by the validation schema
        return;
      }

      const updatedUser = await updateUser(user.id, updates);

      showSuccess?.('User updated successfully!');
      onSuccess?.(updatedUser);

    } catch (err) {
      // Extract error details more thoroughly
      let errorMessage = 'Failed to update user';
      let errorCode = '';
      let errorCategory = '';
      let errorDetails = '';

      if (err instanceof Error) {
        errorMessage = err.message;
        errorDetails = err.stack || '';
      } else if (typeof err === 'object' && err !== null) {
        // Try to extract meaningful error information
        const errorObj = err as any;
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
        showError?.('User not found. The user may have been deleted.');
      } else if (errorCode === 'INSUFFICIENT_PERMISSIONS' || errorCategory === 'authorization' ||
        errorMessage.includes('permission') || errorMessage.includes('Insufficient') ||
        errorMessage.includes('cannot update') || errorMessage.includes('Admins cannot update other admin') ||
        errorMessage.includes('Managers cannot update other managers') ||
        errorMessage.includes('Managers cannot update admin accounts')) {
        // Permission-related errors
        let permissionMessage = 'You do not have permission to update this user';
        if (errorMessage.includes('Admins cannot update other admin')) {
          permissionMessage = 'Administrators cannot update other administrator accounts';
        } else if (errorMessage.includes('Managers cannot update other managers')) {
          permissionMessage = 'Managers cannot update other manager accounts';
        } else if (errorMessage.includes('Managers cannot update admin')) {
          permissionMessage = 'Managers cannot update administrator accounts';
        }
        showError?.(permissionMessage);
      } else if (errorCode === 'VALIDATION_FAILED' || errorCategory === 'validation' ||
        errorMessage.includes('Username already taken')) {
        // Validation errors
        if (errorMessage.includes('Username already taken')) {
          showError?.('Username is already taken. Please choose a different username.');
        } else {
          showError?.('Unable to update user due to validation error. Please check your input.');
        }
      } else {
        // Unknown errors
        showError?.(`Failed to update user: ${errorMessage}`);
      }
    }
  };

  return (
    <Card className="max-w mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          <Typography variant="title-s" className="pb-0.5">Edit User</Typography>
        </CardTitle>
        <CardDescription>
          Update user information and permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* User Info Display */}
        <div className="bg-muted p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Typography variant="label-s" className="font-medium" as="span">Username:</Typography>
              <Typography variant="body-s" color="muted" as="p">{user.username}</Typography>
            </div>
            <div>
              <Typography variant="label-s" className="font-medium" as="span">Email:</Typography>
              <Typography variant="body-s" color="muted" as="p">{user.email}</Typography>
            </div>
            <div>
              <Typography variant="label-s" className="font-medium" as="span">Created:</Typography>
              <Typography variant="body-s" color="muted" as="p">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Typography>
            </div>
            <div>
              <Typography variant="label-s" className="font-medium" as="span">Last Updated:</Typography>
              <Typography variant="body-s" color="muted" as="p">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
              </Typography>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Name */}
            <InputField
              label="Display Name"
              type="text"
              placeholder="Enter display name"
              value={watch('displayName') || ''}
              onChange={(e) => setValue('displayName', e.target.value)}
              error={errors.displayName?.message}
              disabled={isUpdating}
              inputClassName="h-11"
              className="space-y-3"
            />

            {/* Phone */}
            <InputField
              label="Phone Number"
              type="tel"
              placeholder="Enter phone number"
              value={watch('phone') || ''}
              onChange={(e) => setValue('phone', e.target.value)}
              error={errors.phone?.message}
              disabled={isUpdating}
              inputClassName="h-11"
              className="space-y-3"
            />

            {/* Role */}
            <FormField
              label="Role"
              error={errors.role?.message}
              className="space-y-3"
            >
              <Select
                value={selectedRole}
                onValueChange={(value: typeof USER_ROLES.MANAGER | typeof USER_ROLES.STAFF) => setValue('role', value)}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">
                    <div className="flex items-center gap-2">
                      <span>Staff</span>
                      <Typography variant="body-xs" color="muted" as="span">Basic user access</Typography>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <span>Manager</span>
                      <Typography variant="body-xs" color="muted" as="span">Team management access</Typography>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Status */}
            <FormField label="Status" className="space-y-3">
              <Select
                value={isActive ? 'active' : 'inactive'}
                onValueChange={(value: string) => setValue('isActive', value === 'active')}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-11">
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
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4" />
              <span className='text-button-s'>Cancel</span>
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              {isUpdating ? (
                <>
                  <Loading className="w-4 h-4" />
                  <span className='text-button-s'>Updating...</span>
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  <span className='text-button-s'>Update User</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
