import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface ForgotPasswordFormData {
  email: string;
}

const initialData: ForgotPasswordFormData = {
  email: '',
};

type ForgotPasswordValidator = (
  value: unknown,
  data: ForgotPasswordFormData
) => string | null;

const validationRules: Record<string, ForgotPasswordValidator> = {
  email: (value) => {
    const s = typeof value === 'string' ? value : '';
    const required = commonValidationRules.required(s);
    if (required) return required;
    return commonValidationRules.email(s);
  },
};

export const useForgotPasswordFormStore = createFormStore<ForgotPasswordFormData>(
  'forgot-password',
  initialData,
  validationRules
);

export type { ForgotPasswordFormData };
