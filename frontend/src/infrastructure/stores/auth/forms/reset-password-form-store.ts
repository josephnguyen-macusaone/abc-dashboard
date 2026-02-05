import { createFormStore, commonValidationRules } from '../../forms/form-store';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const initialData: ResetPasswordFormData = {
  password: '',
  confirmPassword: '',
};

type ResetPasswordValidator = (
  value: unknown,
  data: ResetPasswordFormData
) => string | null;

const validationRules: Record<string, ResetPasswordValidator> = {
  password: (value) => {
    const s = typeof value === 'string' ? value : '';
    const required = commonValidationRules.required(s);
    if (required) return required;
    return commonValidationRules.password(s);
  },
  confirmPassword: (value, data) =>
    commonValidationRules.confirmPassword('password')(
      value as string,
      data as unknown as Record<string, unknown>
    ),
};

export const useResetPasswordFormStore = createFormStore<ResetPasswordFormData>(
  'reset-password',
  initialData,
  validationRules
);

export type { ResetPasswordFormData };
