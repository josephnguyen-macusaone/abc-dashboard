import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface ForgotPasswordFormData {
  email: string;
}

const initialData: ForgotPasswordFormData = {
  email: '',
};

const validationRules = {
  email: (value: string) => {
    const required = commonValidationRules.required(value);
    if (required) return required;

    return commonValidationRules.email(value);
  },
};

export const useForgotPasswordFormStore = createFormStore(
  'forgot-password',
  initialData,
  validationRules
);

export type { ForgotPasswordFormData };
