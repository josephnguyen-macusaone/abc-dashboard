'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/presentation/components/atoms';
import { InputField, TextAreaField, PhoneField } from '@/presentation/components/molecules';
import { useAuthStore } from '@/infrastructure/stores/auth';
import { useProfileUpdateFormStore } from '@/infrastructure/stores/user/forms';
import { useErrorHandler } from '@/presentation/contexts/error-context';
import { useToast } from '@/presentation/contexts/toast-context';
import { cn } from '@/shared/helpers';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { Save, X, Loader2 } from 'lucide-react';

interface ProfileUpdateFormProps {
  initialData?: {
    displayName: string;
    bio: string;
    phone: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface ProfileFormData {
  displayName: string;
  bio: string;
  phone: string;
}

export function ProfileUpdateForm({ initialData, onSuccess, onCancel, className }: ProfileUpdateFormProps) {
  const { user, updateProfile } = useAuthStore();
  const { handleApiError } = useErrorHandler();
  const toast = useToast();

  // Use Zustand store for form state management
  const {
    data: formData,
    errors,
    isSubmitting: isLoading,
    setFieldValue,
    setFieldError,
    validateForm,
    reset: resetForm,
  } = useProfileUpdateFormStore();

  // Initialize form with provided initial data
  useEffect(() => {
    if (initialData) {
      resetForm({
        displayName: initialData.displayName,
        bio: initialData.bio,
        phone: initialData.phone,
      });
    }
  }, [initialData, resetForm]);


  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFieldValue(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Prepare complete profile data for PUT request
      const cleanString = (str: string) => str.trim().replace(/[\r\n\t]/g, ' ').replace(/"/g, '\\"');
      const profileData = {
        displayName: cleanString(formData.displayName) || '',
        bio: cleanString(formData.bio) || '',
        phone: cleanString(formData.phone) || '',
      };
      // Check if any data actually changed
      const hasDisplayNameChanged = formData.displayName.trim() !== (user?.displayName ?? '');
      const hasBioChanged = formData.bio.trim() !== (user?.bio ?? '');
      const hasPhoneChanged = formData.phone.trim() !== (user?.phone ?? '');
      if (!hasDisplayNameChanged && !hasBioChanged && !hasPhoneChanged) {
        toast.success('No changes to save');
        onSuccess?.();
        return;
      }

      await toast.promise(
        updateProfile(profileData),
        {
          loading: 'Updating your profile...',
          success: () => {
            onSuccess?.();
            return 'Profile updated successfully!';
          },
          error: 'Failed to update profile'
        }
      );
    } catch (error) {
      handleApiError(error, 'Failed to update profile');
    }
  };

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6" >
        {/* Display Name and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <PhoneField
            label="Phone Number"
            value={formData.phone}
            onChange={(value) => handleInputChange('phone', value || '')}
            error={errors.phone}
            disabled={isLoading}
            inputClassName="h-11"
            className="space-y-3"
          />
        </div>


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
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4" />
            <span className='text-button-s'>Cancel</span>
          </Button>

          <Button
            type="submit"
            variant="default"
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className='text-button-s'>Updating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className='text-button-s'>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
