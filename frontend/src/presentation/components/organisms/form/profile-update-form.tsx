'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Typography } from '@/presentation/components/atoms';
import { InputField, TextAreaField, FormField } from '@/presentation/components/molecules';
import { useAuth } from '@/presentation/contexts/auth-context';
import { useToast } from '@/presentation/hooks/use-toast';
import { cn } from '@/shared/utils';
import { User, Save, X, Loader2 } from 'lucide-react';

interface ProfileUpdateFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface ProfileFormData {
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  phone: string;
  avatarUrl: string;
}

export function ProfileUpdateForm({ onSuccess, onCancel, className }: ProfileUpdateFormProps) {
  const { user, handleUpdateProfile } = useAuth();
  const { showSuccess } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    displayName: '',
    bio: '',
    phone: '',
    avatarUrl: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string | null>>>({});

  // Initialize form with current user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        displayName: user.displayName || '',
        bio: user.bio || '',
        phone: user.phone || '',
        avatarUrl: user.avatar || '',
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = (): boolean => {
    const validationErrors: Partial<Record<keyof ProfileFormData, string | null>> = {};

    if (!formData.firstName.trim()) {
      validationErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      validationErrors.lastName = 'Last name is required';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      validationErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.avatarUrl && !/^https?:\/\/.+/.test(formData.avatarUrl)) {
      validationErrors.avatarUrl = 'Please enter a valid URL starting with http:// or https://';
    }

    setErrors(validationErrors);
    return Object.values(validationErrors).every(error => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Prepare update data - only include changed fields
      const updates: Partial<ProfileFormData> = {};

      if (formData.firstName !== (user?.firstName || '')) updates.firstName = formData.firstName.trim();
      if (formData.lastName !== (user?.lastName || '')) updates.lastName = formData.lastName.trim();
      if (formData.displayName !== (user?.displayName || '')) updates.displayName = formData.displayName.trim();
      if (formData.bio !== (user?.bio || '')) updates.bio = formData.bio.trim();
      if (formData.phone !== (user?.phone || '')) updates.phone = formData.phone.trim();
      if (formData.avatarUrl !== (user?.avatar || '')) updates.avatarUrl = formData.avatarUrl.trim();

      if (Object.keys(updates).length === 0) {
        showSuccess('No changes to save');
        onSuccess?.();
        return;
      }

      await handleUpdateProfile(updates);
      showSuccess('Profile updated successfully!');
      onSuccess?.();
    } catch (error) {
      // Error toast is now handled by the auth context
      // We can still show local error state for validation feedback if needed
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('w-full max-w-2xl space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <Typography variant="h3" size="lg" weight="semibold">
            Update Profile
          </Typography>
          <Typography variant="p" size="sm" className="text-muted-foreground">
            Update your personal information and preferences
          </Typography>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={cn(
          'p-4 rounded-lg border border-destructive/20 bg-destructive/10',
          'flex items-start space-x-3'
        )}>
          <div className="flex-1">
            <Typography variant="p" size="sm" weight="medium" color="destructive" className="text-destructive">
              Update Error
            </Typography>
            <Typography variant="p" size="sm" color="destructive" className="text-destructive/80 mt-1">
              {error}
            </Typography>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="First Name"
            type="text"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            error={errors.firstName}
            disabled={isLoading}
            inputClassName="h-11"
            className="space-y-3"
          />

          <InputField
            label="Last Name"
            type="text"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            error={errors.lastName}
            disabled={isLoading}
            inputClassName="h-11"
            className="space-y-3"
          />
        </div>

        {/* Display Name */}
        <InputField
          label="Display Name"
          type="text"
          placeholder="How you want to be displayed"
          value={formData.displayName}
          onChange={(e) => handleInputChange('displayName', e.target.value)}
          error={errors.displayName}
          disabled={isLoading}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Phone */}
        <InputField
          label="Phone Number"
          type="tel"
          placeholder="Enter your phone number"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          error={errors.phone}
          disabled={isLoading}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Avatar URL */}
        <InputField
          label="Avatar URL"
          type="url"
          placeholder="https://example.com/avatar.jpg"
          value={formData.avatarUrl}
          onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
          error={errors.avatarUrl}
          disabled={isLoading}
          inputClassName="h-11"
          className="space-y-3"
        />

        {/* Bio */}
        <TextAreaField
          label="Bio"
          placeholder="Tell us about yourself..."
          value={formData.bio}
          onChange={(value) => handleInputChange('bio', value)}
          error={errors.bio}
          disabled={isLoading}
          rows={4}
          className="space-y-3"
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
