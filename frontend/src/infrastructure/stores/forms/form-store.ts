import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormState<T = object> {
  // State
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  touched: Record<string, boolean>;

  // Actions
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: (field: string, error: string | null) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearFieldError: (field: string) => void;
  clearErrors: () => void;
  setSubmitting: (submitting: boolean) => void;
  setDirty: (dirty: boolean) => void;
  setTouched: (field: string, touched: boolean) => void;
  reset: (initialData?: Partial<T>) => void;
  validateField: (field: string) => boolean;
  validateForm: () => boolean;
}

// Generic form store factory
export function createFormStore<T extends object>(
  storeName: string,
  initialData: T,
  validationRules?: Record<string, (value: unknown, data: T) => string | null>
) {
  return create<FormState<T>>()(
    devtools(
      (set, get) => ({
        // Initial state
        data: { ...initialData },
        errors: {},
        isSubmitting: false,
        isDirty: false,
        touched: {},

        // Actions
        setFieldValue: (field, value) => {
          set((state) => {
            const newData = { ...state.data, [field]: value };
            const newErrors = { ...state.errors };

            // Clear error for this field if it exists
            if (newErrors[field as string]) {
              delete newErrors[field as string];
            }

            // Run validation for this field if rules exist
            if (validationRules?.[field as string]) {
              const error = validationRules[field as string](value, newData);
              if (error) {
                newErrors[field as string] = error;
              }
            }

            return {
              data: newData,
              errors: newErrors,
              isDirty: true,
              touched: { ...state.touched, [field]: true },
            };
          });
        },

        setFieldError: (field, error) => {
          set((state) => {
            if (error) {
              return {
                errors: { ...state.errors, [field]: error },
              };
            } else {
              const newErrors = { ...state.errors };
              delete newErrors[field];
              return { errors: newErrors };
            }
          });
        },

        setErrors: (errors) => {
          set({ errors });
        },

        clearFieldError: (field) => {
          set((state) => {
            const newErrors = { ...state.errors };
            delete newErrors[field];
            return { errors: newErrors };
          });
        },

        clearErrors: () => {
          set({ errors: {} });
        },

        setSubmitting: (submitting) => {
          set({ isSubmitting: submitting });
        },

        setDirty: (dirty) => {
          set({ isDirty: dirty });
        },

        setTouched: (field, touched) => {
          set((state) => ({
            touched: { ...state.touched, [field]: touched },
          }));
        },

        reset: (initialDataOverride) => {
          const resetData = initialDataOverride
            ? { ...initialData, ...initialDataOverride }
            : { ...initialData };

          set({
            data: resetData,
            errors: {},
            isSubmitting: false,
            isDirty: false,
            touched: {},
          });
        },

        validateField: (field) => {
          const state = get();
          if (!validationRules?.[field]) return true;

          const data = state.data as Record<string, unknown>;
          const error = validationRules[field](data[field], state.data);
          if (error) {
            set((state) => ({
              errors: { ...state.errors, [field]: error },
            }));
            return false;
          }

          set((state) => {
            const newErrors = { ...state.errors };
            delete newErrors[field];
            return { errors: newErrors };
          });
          return true;
        },

        validateForm: () => {
          const state = get();
          const newErrors: Record<string, string> = {};
          let isValid = true;

          if (validationRules) {
            const data = state.data as Record<string, unknown>;
            Object.keys(validationRules).forEach((field) => {
              const rule = validationRules[field];
              const error = rule(data[field], state.data);
              if (error) {
                newErrors[field] = error;
                isValid = false;
              }
            });
          }

          set({ errors: newErrors });
          return isValid;
        },
      }),
      {
        name: `${storeName}-form`,
      }
    )
  );
}

// Common validation rules
export const commonValidationRules = {
  required: (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value: string): string | null => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (minLength: number) => (value: string): string | null => {
    if (!value) return null;
    if (value.length < minLength) {
      return `Must be at least ${minLength} characters`;
    }
    return null;
  },

  password: (value: string): string | null => {
    if (!value) return null;
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      return 'Password must contain uppercase, lowercase, and number';
    }
    return null;
  },

  confirmPassword: (passwordField: string) => (value: string, data: Record<string, unknown>): string | null => {
    if (!value) return null;
    if (value !== data[passwordField]) {
      return 'Passwords do not match';
    }
    return null;
  },
};
