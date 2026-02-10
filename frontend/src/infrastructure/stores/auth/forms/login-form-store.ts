import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface LoginFormData {
  email: string;
  password: string;
}

const initialData: LoginFormData = {
  email: '',
  password: '',
};

type LoginValidator = (
  value: unknown,
  data: LoginFormData
) => string | null;

const validationRules: Record<string, LoginValidator> = {
  email: (value) => {
    const s = typeof value === 'string' ? value : '';
    const required = commonValidationRules.required(s);
    if (required) return required;
    return commonValidationRules.email(s);
  },
  password: (value) => commonValidationRules.required(value),
};

export const useLoginFormStore = createFormStore<LoginFormData>(
  'login',
  initialData,
  validationRules
);

export type { LoginFormData };
