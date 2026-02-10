/**
 * Domain Entity: User
 * Represents a user in the business domain
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly name: string = 'User', // Provide default value
    public readonly email: string,
    public readonly role: UserRole,
    public readonly isActive: boolean,
    public readonly username?: string,
    public readonly avatar?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly displayName?: string,
    public readonly bio?: string,
    public readonly phone?: string,
    public readonly lastLogin?: Date,
    public readonly updatedAt?: Date,
    public readonly isFirstLogin?: boolean,
    public readonly langKey?: string,
    public readonly emailVerified?: boolean,
    public readonly lastActivity?: Date,
    public readonly createdAt?: Date,
    public readonly createdBy?: string,
    public readonly lastModifiedBy?: string,
    public readonly managedBy?: string,
    public readonly requiresPasswordChange?: boolean
  ) {}

  /**
   * Check if user has a specific role
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Check if user has admin privileges
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if user has manager privileges or higher
   */
  isManagerOrHigher(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.MANAGER;
  }

  /**
   * Check if user is active
   */
  isActiveUser(): boolean {
    return this.isActive;
  }

  /**
   * Check if user needs to change password on first login
   */
  needsPasswordChange(): boolean {
    return this.isFirstLogin === true;
  }

  /**
   * Check if user email is verified
   */
  isEmailVerified(): boolean {
    return this.emailVerified === true;
  }

  /**
   * Get user's preferred language
   */
  getLanguage(): string {
    return this.langKey || 'en';
  }

  /**
   * Activate user account (email verification)
   */
  activateAccount(): { type: string; userId: string } {
    if (this.isActive) {
      throw new Error('Account already activated');
    }

    // Return domain event for account activation
    return {
      type: 'UserActivated',
      userId: this.id
    };
  }

  /**
   * Record user's first login
   */
  recordFirstLogin(): { type: string; userId: string } {
    if (this.isFirstLogin === false) {
      throw new Error('First login already recorded');
    }

    // Return domain event for first login
    return {
      type: 'UserFirstLoginRecorded',
      userId: this.id
    };
  }

  /**
   * Create a new User instance from plain object
   */
  static fromObject(obj: Record<string, unknown>): User {
    // Validate required fields
    if (!obj.id) {
      throw new Error('User object missing required id field');
    }
    if (!obj.email) {
      throw new Error('User object missing required email field');
    }
    if (!obj.role) {
      throw new Error('User object missing required role field');
    }

    // Type guards for safe property access
    const isString = (value: unknown): value is string => typeof value === 'string';

    if (!obj.name) {
      // Provide fallback for name field with type safety
      obj.name = (isString(obj.displayName) && obj.displayName) ||
                 (isString(obj.username) && obj.username) ||
                 (isString(obj.email) && obj.email.split('@')[0]) ||
                 'User';
    }

    // Ensure id is always a string
    const userId = String(obj.id);

    // Ensure required fields are strings (they should be validated above)
    const name = isString(obj.name) ? obj.name : 'User';
    const email = isString(obj.email) ? obj.email : '';
    const role = obj.role as UserRole; // Should be validated above

    return new User(
      userId,
      name,
      email,
      role,
      typeof obj.isActive === 'boolean' ? obj.isActive : false, // Default to false if not provided
      isString(obj.username) ? obj.username : undefined,
      isString(obj.avatar) ? obj.avatar : undefined,
      isString(obj.firstName) ? obj.firstName : undefined,
      isString(obj.lastName) ? obj.lastName : undefined,
      isString(obj.displayName) ? obj.displayName : undefined,
      isString(obj.bio) ? obj.bio : undefined,
      isString(obj.phone) ? obj.phone : undefined,
      obj.lastLogin instanceof Date || (isString(obj.lastLogin) && !isNaN(Date.parse(obj.lastLogin)))
        ? new Date(obj.lastLogin)
        : undefined,
      obj.updatedAt instanceof Date || (isString(obj.updatedAt) && !isNaN(Date.parse(obj.updatedAt)))
        ? new Date(obj.updatedAt)
        : undefined,
      typeof obj.isFirstLogin === 'boolean' ? obj.isFirstLogin : true, // Default to true for new users
      isString(obj.langKey) ? obj.langKey : 'en',
      typeof obj.emailVerified === 'boolean' ? obj.emailVerified : false,
      obj.lastActivity instanceof Date || (isString(obj.lastActivity) && !isNaN(Date.parse(obj.lastActivity)))
        ? new Date(obj.lastActivity)
        : undefined,
      obj.createdAt instanceof Date || (isString(obj.createdAt) && !isNaN(Date.parse(obj.createdAt)))
        ? new Date(obj.createdAt)
        : undefined,
      isString(obj.createdBy) ? obj.createdBy : undefined,
      isString(obj.lastModifiedBy) ? obj.lastModifiedBy : undefined,
      isString(obj.managedBy) ? obj.managedBy : undefined,
      typeof obj.requiresPasswordChange === 'boolean' ? obj.requiresPasswordChange : undefined
    );
  }

  /**
   * Convert User to plain object for API responses
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      username: this.username,
      avatar: this.avatar,
      firstName: this.firstName,
      lastName: this.lastName,
      displayName: this.displayName,
      bio: this.bio,
      phone: this.phone,
      lastLogin: this.lastLogin?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
      isFirstLogin: this.isFirstLogin,
      langKey: this.langKey,
      emailVerified: this.emailVerified,
      lastActivity: this.lastActivity?.toISOString(),
      createdAt: this.createdAt?.toISOString(),
      createdBy: this.createdBy,
      lastModifiedBy: this.lastModifiedBy,
      managedBy: this.managedBy,
      requiresPasswordChange: this.requiresPasswordChange,
    };
  }
}

/**
 * User Role Enum
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

/**
 * Authentication Tokens
 */
export class AuthTokens {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken?: string,
    public readonly expiresAt?: Date
  ) {}

  /**
   * Check if access token is expired
   */
  isExpired(): boolean {
    return this.expiresAt ? this.expiresAt < new Date() : false;
  }

  /**
   * Check if refresh token is available
   */
  hasRefreshToken(): boolean {
    return !!this.refreshToken;
  }
}

/**
 * Authentication Result
 */
export class AuthResult {
  constructor(
    public readonly user: User,
    public readonly tokens: AuthTokens,
    public readonly isAuthenticated: boolean = true
  ) {}

  /**
   * Create authenticated result
   */
  static authenticated(user: User, tokens: AuthTokens): AuthResult {
    return new AuthResult(user, tokens, true);
  }

  /**
   * Create unauthenticated result
   */
  static unauthenticated(): AuthResult {
    const emptyUser = new User('', 'Guest', '', UserRole.STAFF, false);
    const emptyTokens = new AuthTokens('', '');
    return new AuthResult(emptyUser, emptyTokens, false);
  }
}
