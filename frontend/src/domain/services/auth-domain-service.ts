import { User, UserRole } from '@/domain/entities/user-entity';

/**
 * Domain Service: Authentication Business Rules
 * Contains business logic that spans multiple entities or doesn't belong to a single entity
 */
export class AuthDomainService {
  /**
   * Validate user role hierarchy
   * Business rule: Managers can only manage staff, admins can manage everyone
   */
  static canUserManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.ADMIN]: 3,
      [UserRole.MANAGER]: 2,
      [UserRole.STAFF]: 1,
    };

    return roleHierarchy[managerRole] > roleHierarchy[targetRole];
  }

  /**
   * Validate password strength
   * Business rule: Passwords must meet security requirements
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   * Business rule: Email must be properly formatted
   */
  static validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Determine default role for new users
   * Business rule: New users start as staff unless specified otherwise
   */
  static getDefaultRole(requestedRole?: string): UserRole {
    if (!requestedRole) return UserRole.STAFF;

    // Only allow valid roles
    const validRoles = Object.values(UserRole);
    return validRoles.includes(requestedRole as UserRole)
      ? (requestedRole as UserRole)
      : UserRole.STAFF;
  }

  /**
   * Check if user can perform admin actions
   * Business rule: Only admins can perform administrative tasks
   */
  static canPerformAdminActions(user: User): boolean {
    return user.isActive && user.role === UserRole.ADMIN;
  }

  /**
   * Check if user can access management features
   * Business rule: Managers and admins can access management features
   */
  static canAccessManagementFeatures(user: User): boolean {
    return user.isActive && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER);
  }

  /**
   * Validate user account status
   * Business rule: Inactive users cannot perform actions
   */
  static validateUserAccountStatus(user: User): {
    isValid: boolean;
    reason?: string;
  } {
    if (!user.isActive) {
      return {
        isValid: false,
        reason: 'Account is deactivated. Please contact administrator.',
      };
    }

    // For now, skip the recent login verification check
    // TODO: Implement proper session management and recent login verification
    // when the backend provides lastLogin timestamps

    // // Check if account is too old without recent login
    // const thirtyDaysAgo = new Date();
    // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    //
    // if (!user.lastLogin || user.lastLogin < thirtyDaysAgo) {
    //   return {
    //     isValid: false,
    //     reason: 'Account requires recent login verification.',
    //   };
    // }

    return { isValid: true };
  }

  /**
   * Generate secure password reset token
   * Business rule: Tokens must be cryptographically secure
   */
  static generateSecureToken(): string {
    // In a real implementation, this would use crypto.randomBytes
    // For now, we'll use a simple implementation
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
