// Domain stores
export { useAuthStore } from '@/infrastructure/stores/auth';
export { useUserStore, useDataTableStore } from '@/infrastructure/stores/user';
export { useLicenseStore } from '@/infrastructure/stores/license';

// UI stores
export { useThemeStore, useSidebarStore } from '@/infrastructure/stores/ui';

// Form stores
export {
  useLoginFormStore,
  useResetPasswordFormStore,
  useChangePasswordFormStore,
  useForgotPasswordFormStore,
} from '@/infrastructure/stores/auth/forms';

export { useProfileUpdateFormStore } from '@/infrastructure/stores/user/forms';

// Generic form utilities
export { createFormStore } from '@/infrastructure/stores/forms';

// Constants
export { SIDEBAR_CONSTANTS } from '@/infrastructure/stores/ui';
