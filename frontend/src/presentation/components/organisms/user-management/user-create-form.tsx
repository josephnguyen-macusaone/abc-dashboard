'use client';

import { useMemo, useState } from 'react';
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
import { Typography, Button } from '@/presentation/components/atoms';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/presentation/components/atoms/primitives/card';
import { InputField, FormField, PhoneField } from '@/presentation/components/molecules';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/atoms/forms/select';
import { UserFormTemplate } from '@/presentation/components/templates';
import { Loader2 } from 'lucide-react';

const CREATE_FORM_ID = 'user-create-form';

/** Order for admin role picker: leadership first, then staff (matches product language). */
const ADMIN_ROLE_SECTION_LEADERSHIP: UserRoleType[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.ACCOUNT_MANAGER,
  USER_ROLES.TECH_MANAGER,
  USER_ROLES.AGENT_MANAGER,
];
const ADMIN_ROLE_SECTION_STAFF: UserRoleType[] = [
  USER_ROLES.ACCOUNTANT,
  USER_ROLES.TECH,
  USER_ROLES.AGENT,
];

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

  const adminLeadershipRoles = useMemo(
    () => ADMIN_ROLE_SECTION_LEADERSHIP.filter((r) => creatableSet.has(r)),
    [creatableSet],
  );
  const adminStaffRoles = useMemo(
    () => ADMIN_ROLE_SECTION_STAFF.filter((r) => creatableSet.has(r)),
    [creatableSet],
  );

  const isAdminCreator = currentUser?.role === USER_ROLES.ADMIN;

  const defaultRole =
    availableRoles.length > 0 ? availableRoles[availableRoles.length - 1].value : UserRole.AGENT;

  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: UserRoleType;
  }>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: defaultRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName) {
      return;
    }

    const userData: CreateUserRequest = {
      username: formData.username,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role as UserRole,
      ...(formData.phone && { phone: formData.phone }),
    };

    try {
      const user = await createUser(userData);
      showSuccess?.('User created successfully!');
      onSuccess?.(user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create user. Please try again.';
      showError?.(message);
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
              <CardDescription>Email, name, phone, and role for the new account.</CardDescription>
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

              <FormField label="Role" className="space-y-3">
                <Select
                  value={formData.role}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, role: value as UserRoleType })
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdminCreator ? (
                      <>
                        {adminLeadershipRoles.length > 0 ? (
                          <SelectGroup>
                            <SelectLabel className="text-muted-foreground">
                              Line managers
                            </SelectLabel>
                            {adminLeadershipRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_DEFINITIONS[role]?.displayName ?? role}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : null}
                        {adminLeadershipRoles.length > 0 && adminStaffRoles.length > 0 ? (
                          <SelectSeparator />
                        ) : null}
                        {adminStaffRoles.length > 0 ? (
                          <SelectGroup>
                            <SelectLabel className="text-muted-foreground">Staff roles</SelectLabel>
                            {adminStaffRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_DEFINITIONS[role]?.displayName ?? role}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ) : null}
                      </>
                    ) : (
                      availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))
                    )}
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
