/**
 * Domain Entity: User
 * Represents a user in the business domain
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly role: UserRole,
    public readonly isActive: boolean,
    public readonly avatar?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly displayName?: string,
    public readonly bio?: string,
    public readonly phone?: string,
    public readonly lastLogin?: Date,
    public readonly updatedAt?: Date
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
   * Create a new User instance from plain object
   */
  static fromObject(obj: any): User {
    return new User(
      obj.id,
      obj.name,
      obj.email,
      obj.role,
      obj.isActive,
      obj.avatar,
      obj.firstName,
      obj.lastName,
      obj.displayName,
      obj.bio,
      obj.phone,
      obj.lastLogin ? new Date(obj.lastLogin) : undefined,
      obj.updatedAt ? new Date(obj.updatedAt) : undefined
    );
  }

  /**
   * Convert User to plain object for API responses
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      avatar: this.avatar,
      firstName: this.firstName,
      lastName: this.lastName,
      displayName: this.displayName,
      bio: this.bio,
      phone: this.phone,
      lastLogin: this.lastLogin?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
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
    const emptyUser = new User('', '', '', UserRole.STAFF, false, undefined, new Date());
    const emptyTokens = new AuthTokens('');
    return new AuthResult(emptyUser, emptyTokens, false);
  }
}
