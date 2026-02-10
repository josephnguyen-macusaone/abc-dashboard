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

type ProfileValidator = (
  value: unknown,
  data: ProfileFormData
) => string | null;

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

const validationRules: Record<string, ProfileValidator> = {
  displayName: (value) => {
    const s = stringValue(value);
    const required = commonValidationRules.required(s);
    if (required) return required;
    if (s.length < 2) {
      return 'Display name must be at least 2 characters';
    }
    if (s.length > 50) {
      return 'Display name must be less than 50 characters';
    }
    return null;
  },
  bio: (value) => {
    const s = stringValue(value);
    if (s && s.length > 500) {
      return 'Bio must be less than 500 characters';
    }
    return null;
  },
  phone: (value) => {
    const s = stringValue(value);
    if (s && !/^\+?[1-9]\d{1,14}$/.test(s.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number';
    }
    return null;
  },
};

export const useProfileUpdateFormStore = createFormStore<ProfileFormData>(
  'profile-update',
  initialData,
  validationRules
);

export type { ProfileFormData };
