'use client';

import { useState } from 'react';
import { useUser } from '@/presentation/contexts/user-context';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { CreateUserDTO, User } from '@/application/dto/user-dto';
import { UserRole } from '@/domain/entities/user-entity';
import { PermissionUtils } from '@/shared/constants';
import { Typography, Button } from '@/presentation/components/atoms';
import { InputField, FormField } from '@/presentation/components/molecules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/forms/select';
import { UserPlus, Loader2, X, ArrowLeft, Edit } from 'lucide-react';

interface UserCreateFormProps {
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export function UserCreateForm({ onSuccess, onCancel }: UserCreateFormProps) {
  const { createUser, loading: { createUser: isCreating }, error: { createUser: createError } } = useUser();
  const { user: currentUser } = useAuth();
  const { success: showSuccess } = useToast();

  // Get available roles for the current user
  const getAvailableRoles = () => {
    const roles: { value: 'admin' | 'manager' | 'staff'; label: string }[] = [];

    if (PermissionUtils.canCreateUser(currentUser?.role)) {
      // Check each role individually since PermissionUtils.canCreateUser only checks if user can create users in general
      if (currentUser?.role === 'admin') {
        roles.push({ value: 'admin', label: 'Admin' });
        roles.push({ value: 'manager', label: 'Manager' });
      } else if (currentUser?.role === 'manager') {
        roles.push({ value: 'manager', label: 'Manager' });
      }
      // Staff role is always available for users who can create users
      roles.push({ value: 'staff', label: 'Staff' });
    }

    return roles;
  };

  const availableRoles = getAvailableRoles();
  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'manager' | 'staff'
  }>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: availableRoles[0]?.value || 'staff'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName) {
      return; // Error will be shown by validation
    }

    try {
      const userData: CreateUserDTO = {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role as UserRole,
      };

      const user = await createUser(userData);
      showSuccess?.('User created successfully!');
      onSuccess?.(user);

    } catch (err) {
      // Error is handled by the UserContext
    }
  };

  return (
    <Card className="max-w mx-auto">
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
            label="Username"
            type="text"
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            disabled={isCreating}
            inputClassName="h-11"
            className="space-y-3"
          />

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <FormField label="Role" className="space-y-3">
            <Select
              value={formData.role}
              onValueChange={(value: 'admin' | 'manager' | 'staff') => setFormData({ ...formData, role: value })}
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
