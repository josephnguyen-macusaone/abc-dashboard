/**
 * Shared validation schemas for user update.
 * Kept in sync with backend user.schemas.js (Joi updateUser schema).
 */
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { USER_ROLES } from '@/shared/constants';

export const updateUserSchema = z
  .object({
    displayName: z
      .string()
      .min(1, 'Display name cannot be empty')
      .max(100, 'Display name cannot exceed 100 characters')
      .optional(),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || isValidPhoneNumber(val), {
        message: 'Phone number must be in valid format',
      }),
    role: z
      .enum([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.STAFF])
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      return Object.values(data).some(
        (value) => value !== undefined && value !== null && value !== ''
      );
    },
    { message: 'At least one field must be updated' }
  );

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
