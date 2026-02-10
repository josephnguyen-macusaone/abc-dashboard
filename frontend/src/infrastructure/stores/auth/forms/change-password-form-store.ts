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

type ChangePasswordValidator = (
  value: unknown,
  data: ChangePasswordFormData
) => string | null;

const validationRules: Record<string, ChangePasswordValidator> = {
  currentPassword: (_value) => {
    // Only required if not a forced change (handled by component logic)
    return null; // Validation will be conditional in component
  },
  newPassword: (value) => {
    const s = typeof value === 'string' ? value : '';
    const required = commonValidationRules.required(s);
    if (required) return required;
    return commonValidationRules.password(s);
  },
  confirmPassword: (value, data) =>
    commonValidationRules.confirmPassword('newPassword')(
      value as string,
      data as unknown as Record<string, unknown>
    ),
};

export const useChangePasswordFormStore = createFormStore<ChangePasswordFormData>(
  'change-password',
  initialData,
  validationRules
);

export type { ChangePasswordFormData };
