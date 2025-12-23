import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface ProfileFormData {
  displayName: string;
  bio: string;
  phone: string;
}

const initialData: ProfileFormData = {
  displayName: '',
  bio: '',
  phone: '',
};

const validationRules = {
  displayName: (value: string) => {
    const required = commonValidationRules.required(value);
    if (required) return required;

    if (value.length < 2) {
      return 'Display name must be at least 2 characters';
    }
    if (value.length > 50) {
      return 'Display name must be less than 50 characters';
    }
    return null;
  },
  bio: (value: string) => {
    if (value && value.length > 500) {
      return 'Bio must be less than 500 characters';
    }
    return null;
  },
  phone: (value: string) => {
    if (value && !/^\+?[1-9]\d{1,14}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number';
    }
    return null;
  },
};

export const useProfileUpdateFormStore = createFormStore(
  'profile-update',
  initialData,
  validationRules
);

export type { ProfileFormData };
