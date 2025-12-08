import { User, UserRole } from '@/domain/entities/user-entity';
import { AuthDomainService } from './auth-domain-service';

/**
 * Domain Service: User Business Rules
 * Contains business logic specific to user entities and operations
 */
export class UserDomainService {
  /**
   * Validate user profile update permissions
   * Business rule: Users can only update their own profiles, admins can update any
   */
  static canUserUpdateProfile(updater: User, targetUserId: string): boolean {
    return updater.id === targetUserId || AuthDomainService.canPerformAdminActions(updater);
  }

  /**
   * Validate user deletion permissions
   * Business rule: Users cannot delete themselves, admins can delete anyone except other admins
   */
  static canUserDeleteUser(deleter: User, targetUser: User): boolean {
    // Cannot delete yourself
    if (deleter.id === targetUser.id) {
      return false;
    }

    // Admins can delete anyone except other admins
    if (AuthDomainService.canPerformAdminActions(deleter)) {
      return targetUser.role !== UserRole.ADMIN;
    }

    // Managers can only delete staff
    if (deleter.role === UserRole.MANAGER) {
      return targetUser.role === UserRole.STAFF;
    }

    return false;
  }

  /**
   * Validate user role change permissions
   * Business rule: Only admins can change roles, and cannot demote other admins
   */
  static canUserChangeRole(changer: User, currentRole: UserRole, newRole: UserRole): boolean {
    if (!AuthDomainService.canPerformAdminActions(changer)) {
      return false;
    }

    // Cannot demote admins to non-admin roles
    if (currentRole === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      return false;
    }

    return true;
  }

  /**
   * Validate user activation/deactivation permissions
   * Business rule: Only admins can deactivate users, managers can activate staff
   */
  static canUserToggleActivation(toggler: User, targetUser: User, activate: boolean): boolean {
    if (activate) {
      // Activation permissions
      return AuthDomainService.canPerformAdminActions(toggler) ||
            (toggler.role === UserRole.MANAGER && targetUser.role === UserRole.STAFF);
    } else {
      // Deactivation permissions - only admins
      return AuthDomainService.canPerformAdminActions(toggler) && targetUser.role !== UserRole.ADMIN;
    }
  }

  /**
   * Validate user data consistency
   * Business rule: User data must be consistent and valid
   */
  static validateUserDataConsistency(user: Partial<User>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Email format validation
    if (user.email && !AuthDomainService.validateEmailFormat(user.email)) {
      errors.push('Invalid email format');
    }

    // Username constraints
    if (user.username && user.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    // Display name constraints
    if (user.displayName && user.displayName.trim().length < 1) {
      errors.push('Display name cannot be empty');
    }

    // Role validation
    if (user.role && !Object.values(UserRole).includes(user.role)) {
      errors.push('Invalid user role');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate user account age in days
   * Business rule: Account age affects certain permissions and features
   */
  static getAccountAgeInDays(user: User): number {
    if (!user.createdAt) {
      return 0;
    }

    const now = new Date();
    const createdAt = new Date(user.createdAt);
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if user account is considered "new"
   * Business rule: New accounts have limited permissions for first 7 days
   */
  static isNewAccount(user: User): boolean {
    return this.getAccountAgeInDays(user) <= 7;
  }

  /**
   * Get user status summary
   * Business rule: Provides comprehensive account status information
   */
  static getUserStatusSummary(user: User): {
    isActive: boolean;
    isNew: boolean;
    accountAge: number;
    canLogin: boolean;
    statusMessage: string;
  } {
    const accountValidation = AuthDomainService.validateUserAccountStatus(user);
    const isNew = this.isNewAccount(user);
    const accountAge = this.getAccountAgeInDays(user);

    return {
      isActive: user.isActive,
      isNew,
      accountAge,
      canLogin: accountValidation.isValid,
      statusMessage: accountValidation.reason || (user.isActive ? 'Active account' : 'Inactive account'),
    };
  }

  /**
   * Validate bulk operations permissions
   * Business rule: Bulk operations require appropriate permissions
   */
  static canPerformBulkOperation(operator: User, operation: 'delete' | 'activate' | 'deactivate', targetUsers: User[]): boolean {
    if (!AuthDomainService.canPerformAdminActions(operator)) {
      return false;
    }

    switch (operation) {
      case 'delete':
        return targetUsers.every(target => this.canUserDeleteUser(operator, target));
      case 'activate':
        return targetUsers.every(target => this.canUserToggleActivation(operator, target, true));
      case 'deactivate':
        return targetUsers.every(target => this.canUserToggleActivation(operator, target, false));
      default:
        return false;
    }
  }
}
