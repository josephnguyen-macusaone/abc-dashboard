import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const initialData: ChangePasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const validationRules = {
  currentPassword: (value: string) => {
    // Only required if not a forced change (handled by component logic)
    return null; // Validation will be conditional in component
  },
  newPassword: (value: string) => {
    const required = commonValidationRules.required(value);
    if (required) return required;

    return commonValidationRules.password(value);
  },
  confirmPassword: commonValidationRules.confirmPassword('newPassword'),
};

export const useChangePasswordFormStore = createFormStore(
  'change-password',
  initialData,
  validationRules
);

export type { ChangePasswordFormData };
