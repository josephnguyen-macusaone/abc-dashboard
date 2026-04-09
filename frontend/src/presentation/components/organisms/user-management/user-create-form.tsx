'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { useUserStore } from '@/infrastructure/stores/user';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useToast } from '@/presentation/contexts/toast-context';
import { User } from '@/application/dto/user-dto';
import { UserRole } from '@/domain/entities/user-entity';
import type { CreateUserRequest } from '@/infrastructure/stores/user/user-store';
import {
  PermissionUtils,
  ROLE_DEFINITIONS,
  USER_ROLES,
  type UserRoleType,
} from '@/shared/constants';
import {
  generateStrongProvisionedPassword,
  getProvisionedPasswordError,
} from '@/shared/helpers/provisioned-password';
import { getErrorMessage } from '@/infrastructure/api/core/errors';
import { Typography, Button } from '@/presentation/components/atoms';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/presentation/components/atoms/primitives/card';
import { InputField, FormField, PhoneField, PasswordField } from '@/presentation/components/molecules';
import {
  CREATE_USER_ROLE_SECTION_ADMIN_AND_MANAGERS,
  CREATE_USER_ROLE_SECTION_STAFF,
  UserRoleSelect,
} from '@/presentation/components/molecules/domain/user-management';
import { UserFormTemplate } from '@/presentation/components/templates';
import { Loader2 } from 'lucide-react';

const CREATE_FORM_ID = 'user-create-form';

interface UserCreateFormProps {
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export function UserCreateForm({ onSuccess, onCancel }: UserCreateFormProps) {
  const createUser = useUserStore((s) => s.createUser);
  const formLoading = useUserStore((s) => s.formLoading);
  const currentUser = useAuthStore((s) => s.user);
  const { success: showSuccess, error: showError } = useToast();
  const isCreating = formLoading;

  const creatableRoles = useMemo(
    () => PermissionUtils.getCreatableRoles(currentUser?.role),
    [currentUser?.role],
  );

  const creatableSet = useMemo(() => new Set(creatableRoles), [creatableRoles]);

  const availableRoles = useMemo(
    () =>
      creatableRoles.map((role: UserRoleType) => ({
        value: role,
        label: ROLE_DEFINITIONS[role]?.displayName || role,
      })),
    [creatableRoles],
  );

  const adminAndManagerRoles = useMemo(
    () => CREATE_USER_ROLE_SECTION_ADMIN_AND_MANAGERS.filter((r) => creatableSet.has(r)),
    [creatableSet],
  );
  const staffRoles = useMemo(
    () => CREATE_USER_ROLE_SECTION_STAFF.filter((r) => creatableSet.has(r)),
    [creatableSet],
  );

  const isAdminCreator = currentUser?.role === USER_ROLES.ADMIN;

  const defaultRole =
    availableRoles.length > 0 ? availableRoles[availableRoles.length - 1].value : UserRole.AGENT;

  const showRoleField = availableRoles.length > 1;

  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    confirmPassword: string;
    role: UserRoleType;
  }>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: defaultRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName) {
      return;
    }

    const pwdErr = getProvisionedPasswordError(formData.password);
    if (pwdErr) {
      showError?.(pwdErr);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showError?.('Passwords do not match');
      return;
    }

    const userData: CreateUserRequest = {
      username: formData.username,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
      role: formData.role as UserRole,
      ...(formData.phone && { phone: formData.phone }),
    };

    try {
      const user = await createUser(userData);
      showSuccess?.('User created successfully!');
      onSuccess?.(user);
    } catch (err) {
      showError?.(getErrorMessage(err) || 'Could not create user. Please try again.');
    }
  };

  if (availableRoles.length === 0) {
    return (
      <UserFormTemplate
        title="Create user"
        description="You do not have permission to create users."
        footer={
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Go back
            </Button>
          </div>
        }
      >
        <Typography variant="body-m" color="muted" className="text-center py-8">
          Contact an administrator if you need a new account.
        </Typography>
      </UserFormTemplate>
    );
  }

  return (
    <UserFormTemplate
      title="Create user"
      description="Create a new user account and assign them a role."
      footer={
        <div className="ml-auto flex items-center gap-3">
          <Button
            type="button"
            variant="orderCancel"
            size="order"
            onClick={() => onCancel?.()}
            disabled={isCreating}
            className="shrink-0 min-w-28"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={CREATE_FORM_ID}
            variant="orderPrimary"
            size="order"
            disabled={isCreating}
            className="shrink-0 min-w-44"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      }
    >
      <form id={CREATE_FORM_ID} onSubmit={handleSubmit} className="contents">
        <div className="min-w-0 w-full">
          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle>
                <Typography variant="title-s" className="text-foreground">
                  User details
                </Typography>
              </CardTitle>
              <CardDescription>
                Set an initial password; the account is active and can sign in immediately. No welcome
                email is sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <InputField
                label="Email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isCreating}
                inputClassName="h-11"
                className="space-y-3"
              />

              <PhoneField
                label="Phone (Optional)"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                disabled={isCreating}
                inputClassName="h-11"
                className="space-y-3"
              />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                <InputField
                  label="First Name"
                  type="text"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  disabled={isCreating}
                  inputClassName="h-11"
                  className="space-y-3"
                />
                <InputField
                  label="Last Name"
                  type="text"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  disabled={isCreating}
                  inputClassName="h-11"
                  className="space-y-3"
                />
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <Typography variant="body-s" className="text-foreground font-medium sm:pb-2">
                    Initial password
                  </Typography>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-9"
                    disabled={isCreating}
                    onClick={() => {
                      const p = generateStrongProvisionedPassword();
                      setFormData((prev) => ({ ...prev, password: p, confirmPassword: p }));
                    }}
                  >
                    Generate strong password
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
                  <PasswordField
                    id="create-user-password"
                    label="Password"
                    placeholder="Enter password"
                    required
                    disabled={isCreating}
                    value={formData.password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="create-user-confirm-password"
                    label="Confirm password"
                    placeholder="Confirm password"
                    required
                    disabled={isCreating}
                    value={formData.confirmPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    autoComplete="new-password"
                  />
                </div>
                <Typography variant="body-xs" color="muted">
                  At least 8 characters with uppercase, lowercase, and a number.
                </Typography>
              </div>

              {showRoleField ? (
                <FormField label="Role" className="space-y-3">
                  {isAdminCreator ? (
                    <UserRoleSelect
                      variant="create-admin-sectioned"
                      value={formData.role}
                      onValueChange={(role) => setFormData({ ...formData, role })}
                      disabled={isCreating}
                      adminAndManagerRoles={adminAndManagerRoles}
                      staffRoles={staffRoles}
                    />
                  ) : (
                    <UserRoleSelect
                      variant="create-flat"
                      value={formData.role}
                      onValueChange={(role) => setFormData({ ...formData, role })}
                      disabled={isCreating}
                      options={availableRoles}
                    />
                  )}
                </FormField>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </form>
    </UserFormTemplate>
  );
}
