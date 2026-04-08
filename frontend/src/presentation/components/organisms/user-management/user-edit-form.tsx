'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUserStore } from '@/infrastructure/stores/user';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { updateUserSchema, type UpdateUserFormData } from '@/shared/schemas';
import { useToast } from '@/presentation/contexts/toast-context';
import { User, UpdateUserDTO } from '@/application/dto/user-dto';
import { UserRole } from '@/domain/entities/user-entity';
import { USER_ROLES, type UserRoleType } from '@/shared/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/presentation/components/atoms/primitives/card';
import { Button } from '@/presentation/components/atoms/primitives/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { FormField, InputField, PhoneField } from '@/presentation/components/molecules';
import {
  CREATE_USER_ROLE_SECTION_ADMIN_AND_MANAGERS,
  CREATE_USER_ROLE_SECTION_STAFF,
  RoleBadge,
  UserRoleSelect,
} from '@/presentation/components/molecules/domain/user-management';
import { Loading } from '@/presentation/components/atoms/display/loading';
import { Typography } from '@/presentation/components/atoms';
import { UserFormTemplate } from '@/presentation/components/templates';

const EDIT_FORM_ID = 'user-edit-form';

interface UserEditFormProps {
  user: User;
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
  const updateUser = useUserStore((s) => s.updateUser);
  const formLoading = useUserStore((s) => s.formLoading);
  const viewer = useAuthStore((s) => s.user);
  const { success: showSuccess, error: showError } = useToast();
  const isUpdating = formLoading;
  const isAccountantViewer = viewer?.role === USER_ROLES.ACCOUNTANT;

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      displayName: user.displayName,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
    },
  });

  /* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() for controlled Select fields */
  const selectedRole = watch('role');
  const isActive = watch('isActive');
  /* eslint-enable react-hooks/incompatible-library */

  const onSubmit = async (data: UpdateUserFormData) => {
    try {
      const updates: UpdateUserDTO = {};

      if (data.displayName !== undefined && data.displayName !== user.displayName) {
        updates.displayName = data.displayName;
      }

      if (data.phone !== undefined && data.phone !== (user.phone || '')) {
        updates.phone = data.phone || undefined;
      }

      if (
        !isAccountantViewer &&
        data.role !== undefined &&
        data.role !== user.role
      ) {
        updates.role = data.role as UserRole;
      }

      if (data.isActive !== undefined && data.isActive !== user.isActive) {
        updates.isActive = data.isActive;
      }

      if (Object.keys(updates).length === 0) {
        return;
      }

      const updatedUser = await updateUser(user.id, updates);

      showSuccess?.('User updated successfully!');
      onSuccess?.(updatedUser);
    } catch (err) {
      let errorMessage = 'Failed to update user';
      let errorCode = '';
      let errorCategory = '';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as {
          message?: string;
          error?: string;
          code?: string;
          category?: string;
          details?: unknown;
          response?: { data?: { message?: string; error?: string; code?: string; category?: string } };
        };
        if (errorObj.message) errorMessage = errorObj.message;
        if (errorObj.error && typeof errorObj.error === 'string') errorMessage = errorObj.error;
        if (errorObj.code) errorCode = errorObj.code;
        if (errorObj.category) errorCategory = errorObj.category;
        if (errorObj.response?.data?.message) errorMessage = errorObj.response.data.message;
        if (errorObj.response?.data?.error) errorMessage = errorObj.response.data.error;
        if (errorObj.response?.data?.code) errorCode = errorObj.response.data.code;
        if (errorObj.response?.data?.category) errorCategory = errorObj.response.data.category;
      }

      if (
        errorMessage.includes('not found') ||
        errorMessage.includes('NOT_FOUND') ||
        errorCode === 'USER_NOT_FOUND'
      ) {
        showError?.('User not found. The user may have been deleted.');
      } else if (
        errorCode === 'INSUFFICIENT_PERMISSIONS' ||
        errorCategory === 'authorization' ||
        errorMessage.includes('permission') ||
        errorMessage.includes('Insufficient') ||
        errorMessage.includes('cannot update') ||
        errorMessage.includes('Admins cannot update other admin') ||
        errorMessage.includes('Managers cannot update other managers') ||
        errorMessage.includes('Managers cannot update admin accounts')
      ) {
        let permissionMessage = 'You do not have permission to update this user';
        if (errorMessage.includes('Admins cannot update other admin')) {
          permissionMessage = 'Administrators cannot update other administrator accounts';
        } else if (errorMessage.includes('Managers cannot update other managers')) {
          permissionMessage = 'Managers cannot update other manager accounts';
        } else if (errorMessage.includes('Managers cannot update admin')) {
          permissionMessage = 'Managers cannot update administrator accounts';
        }
        showError?.(permissionMessage);
      } else if (
        errorCode === 'VALIDATION_FAILED' ||
        errorCategory === 'validation' ||
        errorMessage.includes('Username already taken')
      ) {
        if (errorMessage.includes('Username already taken')) {
          showError?.('Username is already taken. Please choose a different username.');
        } else {
          showError?.('Unable to update user due to validation error. Please check your input.');
        }
      } else {
        showError?.(`Failed to update user: ${errorMessage}`);
      }
    }
  };

  return (
    <UserFormTemplate
      title="Edit user"
      description="Update user information and permissions."
      footer={
        <div className="ml-auto flex items-center gap-3">
          <Button
            type="button"
            variant="orderCancel"
            size="order"
            onClick={() => onCancel?.()}
            disabled={isUpdating}
            className="shrink-0 min-w-28"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={EDIT_FORM_ID}
            variant="orderPrimary"
            size="order"
            disabled={isUpdating}
            className="shrink-0 min-w-44"
          >
            {isUpdating ? (
              <>
                <Loading className="h-4 w-4" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      }
    >
      <form id={EDIT_FORM_ID} onSubmit={handleSubmit(onSubmit)} className="contents">
        <div className="min-w-0 w-full">
          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle>
                <Typography variant="title-s" className="text-foreground">
                  User details
                </Typography>
              </CardTitle>
              <CardDescription>
                {isAccountantViewer
                  ? 'Display name, phone, and account status. Role changes require an administrator.'
                  : 'Display name, phone, role, and account status.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
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
                <PhoneField
                  label="Phone Number"
                  value={watch('phone') || ''}
                  onChange={(value) => setValue('phone', value || '')}
                  error={errors.phone?.message}
                  disabled={isUpdating}
                  inputClassName="h-11"
                  className="space-y-3"
                />
              </div>

              <FormField label="Role" error={errors.role?.message} className="space-y-3">
                {isAccountantViewer ? (
                  <div className="flex min-h-11 flex-col justify-center gap-1 rounded-md border border-input bg-muted/30 px-3 py-2">
                    <RoleBadge role={user.role as UserRoleType} variant="minimal" showIcon />
                    <Typography variant="caption" color="muted" className="text-muted-foreground">
                      Accountants cannot assign or change roles.
                    </Typography>
                  </div>
                ) : (
                  <UserRoleSelect
                    variant="edit-sectioned"
                    adminAndManagerRoles={CREATE_USER_ROLE_SECTION_ADMIN_AND_MANAGERS}
                    staffRoles={CREATE_USER_ROLE_SECTION_STAFF}
                    value={selectedRole}
                    onValueChange={(value) => setValue('role', value)}
                    disabled={isUpdating || user.role === USER_ROLES.ADMIN}
                  />
                )}
              </FormField>

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
            </CardContent>
          </Card>
        </div>
      </form>
    </UserFormTemplate>
  );
}
