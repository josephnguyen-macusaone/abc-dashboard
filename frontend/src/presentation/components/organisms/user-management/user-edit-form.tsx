'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserManagementService } from '@/presentation/hooks/use-user-management-service';
import { User, UpdateUserDTO } from '@/application/dto/user-dto';
import { UserRole } from '@/domain/entities/user-entity';
import { USER_ROLE_LABELS } from '@/shared/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Input } from '@/presentation/components/atoms/forms/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/ui/select';
import { FormField } from '@/presentation/components/molecules/form/form-field';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { Loading } from '@/presentation/components/atoms/display/loading';
import { Typography } from '@/presentation/components/atoms';

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
  user: User;
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
  const userManagementService = useUserManagementService();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [updatedUser, setUpdatedUser] = useState<User | null>(null);

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
      setLoading(true);
      setError(null);

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
        setError('No changes detected');
        return;
      }

      const updatedUser = await userManagementService.updateUser(user.id, updates);

      setUpdatedUser(updatedUser);
      setSuccess(true);

      // Call success callback
      onSuccess?.(updatedUser);

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
          <CardTitle className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            User Updated Successfully
          </CardTitle>
          <CardDescription>
            The user&apos;s information has been updated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                {/* MAC USA ONE Typography: Label S for labels */}
                <Typography variant="label-s" className="font-medium" as="span">Name:</Typography>
                {/* MAC USA ONE Typography: Body S for values */}
                <Typography variant="body-s" as="p">{updatedUser.displayName}</Typography>
              </div>
              <div>
                <Typography variant="label-s" className="font-medium" as="span">Email:</Typography>
                <Typography variant="body-s" as="p">{updatedUser.email}</Typography>
              </div>
              <div>
                <Typography variant="label-s" className="font-medium" as="span">Role:</Typography>
                <Typography variant="body-s" as="p" className="capitalize">
                  {USER_ROLE_LABELS[updatedUser.role as keyof typeof USER_ROLE_LABELS] || updatedUser.role}
                </Typography>
              </div>
              <div>
                <Typography variant="label-s" className="font-medium" as="span">Status:</Typography>
                <Typography variant="body-s" as="p">
                  {updatedUser.isActive ? 'Active' : 'Inactive'}
                </Typography>
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
                      {/* MAC USA ONE Typography: Body XS for descriptions */}
                      <Typography variant="body-xs" color="muted" as="span">Basic user access</Typography>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <span>Manager</span>
                      <Typography variant="body-xs" color="muted" as="span">Team management access</Typography>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <span>Administrator</span>
                      <Typography variant="body-xs" color="muted" as="span">Full system access</Typography>
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
