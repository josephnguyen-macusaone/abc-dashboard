'use client';

import { useState } from 'react';
import { useUser } from '@/presentation/contexts/user-context';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useToast } from '@/presentation/contexts/toast-context';
import { CreateUserDTO, User } from '@/application/dto/user-dto';
import { UserRole } from '@/domain/entities/user-entity';
import { PermissionUtils, ROLE_DEFINITIONS, type UserRoleType } from '@/shared/constants';
import { Typography, Button } from '@/presentation/components/atoms';
import { InputField, FormField, PhoneField } from '@/presentation/components/molecules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/primitives/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/forms/select';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { UserPlus, Loader2, X } from 'lucide-react';

interface UserCreateFormProps {
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export function UserCreateForm({ onSuccess, onCancel }: UserCreateFormProps) {
  const { createUser, loading: { createUser: isCreating } } = useUser();
  const { user: currentUser } = useAuthStore();
  const { success: showSuccess } = useToast();

  // Get available roles for the current user based on role creation permissions
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
  const defaultRole = availableRoles.length > 0 ? availableRoles[availableRoles.length - 1].value : 'staff';

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
      return; // Error will be shown by validation
    }

    const userData: CreateUserDTO = {
      username: formData.username,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      role: formData.role as UserRole,
    };

    const user = await createUser(userData);
    showSuccess?.('User created successfully!');
    onSuccess?.(user);
  };

  // If user cannot create any users, show access denied message
  if (availableRoles.length === 0) {
    return (
      <Card className="max-w mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <Typography variant="title-s">Create New User</Typography>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Typography variant="body-m" className="text-muted-foreground">
              You do not have permission to create users.
            </Typography>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="mt-4"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          <Typography variant="title-s">Create New User</Typography>
        </CardTitle>
        <CardDescription>
          Create a new user account and assign them a role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              onValueChange={(value: string) => setFormData({ ...formData, role: value as UserRoleType })}
              disabled={isCreating}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4" />
              <span className='text-button-s'>Cancel</span>
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className='text-button-s'>Creating...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span className='text-button-s'>Create User</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
