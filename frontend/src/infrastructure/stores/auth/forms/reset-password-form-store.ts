import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const initialData: ResetPasswordFormData = {
  password: '',
  confirmPassword: '',
};

const validationRules = {
  password: (value: string) => {
    const required = commonValidationRules.required(value);
    if (required) return required;

    return commonValidationRules.password(value);
  },
  confirmPassword: commonValidationRules.confirmPassword('password'),
};

export const useResetPasswordFormStore = createFormStore(
  'reset-password',
  initialData,
  validationRules
);

export type { ResetPasswordFormData };
