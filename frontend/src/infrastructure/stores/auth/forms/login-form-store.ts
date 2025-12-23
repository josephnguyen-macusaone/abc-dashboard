import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface LoginFormData {
  email: string;
  password: string;
}

const initialData: LoginFormData = {
  email: '',
  password: '',
};

const validationRules = {
  email: (value: string) => {
    const required = commonValidationRules.required(value);
    if (required) return required;

    return commonValidationRules.email(value);
  },
  password: commonValidationRules.required,
};

export const useLoginFormStore = createFormStore(
  'login',
  initialData,
  validationRules
);

export type { LoginFormData };
