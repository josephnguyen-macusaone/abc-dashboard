'use client';

import { useState } from 'react';
import { useUser } from '@/presentation/contexts/user-context';
import { CreateUserDTO, User } from '@/application/dto/user-dto';
import { UserRole } from '@/domain/entities/user-entity';
import { Typography } from '@/presentation/components/atoms';
import { InputField, FormField } from '@/presentation/components/molecules';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Alert, AlertDescription } from '@/presentation/components/atoms/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/atoms/forms/select';

interface UserCreateFormProps {
  onSuccess?: (user: User) => void;
  onCancel?: () => void;
}

export function UserCreateForm({ onSuccess, onCancel }: UserCreateFormProps) {
  const { createUser, loading: { createUser: isCreating }, error: { createUser: createError } } = useUser();

  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'staff' as 'admin' | 'manager' | 'staff'
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
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        role: formData.role as UserRole,
      };

      const user = await createUser(userData);
      setSuccess(true);
      onSuccess?.(user);

    } catch (err) {
      // Error is handled by the UserContext
    }
  };

  if (success) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-success">
            User Created Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* MAC USA ONE Typography: Body M for success message */}
          <Typography variant="body-m" color="muted">
            The user has been added to the system.
          </Typography>
          <Button
            onClick={onCancel}
            variant="default"
          >
            Back to Users
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        {/* MAC USA ONE Typography: Title M for form title */}
        <CardTitle>Create New User</CardTitle>
      </CardHeader>
      <CardContent>
        {createError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Username"
            type="text"
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
          />

          <InputField
            label="Email"
            type="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="First Name"
              type="text"
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              required
            />

            <InputField
              label="Last Name"
              type="text"
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              required
            />
          </div>

          <FormField label="Role">
            <Select
              value={formData.role}
              onValueChange={(value: 'admin' | 'manager' | 'staff') => setFormData({...formData, role: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
