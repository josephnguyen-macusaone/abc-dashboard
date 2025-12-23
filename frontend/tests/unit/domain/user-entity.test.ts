import { User, UserRole, AuthTokens, AuthResult } from '@/domain/entities/user-entity'

describe('User Entity', () => {
  describe('User Class', () => {
    const mockUserData = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.STAFF,
      isActive: true,
      username: 'johndoe',
      avatar: 'avatar.jpg',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'Johnny',
      bio: 'Software developer',
      phone: '+1234567890',
      lastLogin: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-10'),
      isFirstLogin: false,
      langKey: 'en',
      emailVerified: true,
      lastActivity: new Date('2024-01-14'),
      createdAt: new Date('2024-01-01'),
      createdBy: 'admin-user',
      lastModifiedBy: 'admin-user',
      managedBy: 'manager-user',
      requiresPasswordChange: false,
    }

    describe('constructor', () => {
      it('should create a user with all properties', () => {
        const user = new User(
          mockUserData.id,
          mockUserData.name,
          mockUserData.email,
          mockUserData.role,
          mockUserData.isActive,
          mockUserData.username,
          mockUserData.avatar,
          mockUserData.firstName,
          mockUserData.lastName,
          mockUserData.displayName,
          mockUserData.bio,
          mockUserData.phone,
          mockUserData.lastLogin,
          mockUserData.updatedAt,
          mockUserData.isFirstLogin,
          mockUserData.langKey,
          mockUserData.emailVerified,
          mockUserData.lastActivity,
          mockUserData.createdAt,
          mockUserData.createdBy,
          mockUserData.lastModifiedBy,
          mockUserData.managedBy,
          mockUserData.requiresPasswordChange
        )

        expect(user.id).toBe(mockUserData.id)
        expect(user.name).toBe(mockUserData.name)
        expect(user.email).toBe(mockUserData.email)
        expect(user.role).toBe(mockUserData.role)
        expect(user.isActive).toBe(mockUserData.isActive)
        expect(user.username).toBe(mockUserData.username)
        expect(user.avatar).toBe(mockUserData.avatar)
        expect(user.firstName).toBe(mockUserData.firstName)
        expect(user.lastName).toBe(mockUserData.lastName)
        expect(user.displayName).toBe(mockUserData.displayName)
        expect(user.bio).toBe(mockUserData.bio)
        expect(user.phone).toBe(mockUserData.phone)
        expect(user.lastLogin).toBe(mockUserData.lastLogin)
        expect(user.updatedAt).toBe(mockUserData.updatedAt)
        expect(user.isFirstLogin).toBe(mockUserData.isFirstLogin)
        expect(user.langKey).toBe(mockUserData.langKey)
        expect(user.emailVerified).toBe(mockUserData.emailVerified)
        expect(user.lastActivity).toBe(mockUserData.lastActivity)
        expect(user.createdAt).toBe(mockUserData.createdAt)
        expect(user.createdBy).toBe(mockUserData.createdBy)
        expect(user.lastModifiedBy).toBe(mockUserData.lastModifiedBy)
        expect(user.managedBy).toBe(mockUserData.managedBy)
        expect(user.requiresPasswordChange).toBe(mockUserData.requiresPasswordChange)
      })

      it('should create a user with default name when not provided', () => {
        const user = new User('user-123', undefined as any, 'john@example.com', UserRole.STAFF, true)

        expect(user.name).toBe('User')
      })

      it('should create a user with minimal required properties', () => {
        const user = new User('user-123', 'John', 'john@example.com', UserRole.STAFF, true)

        expect(user.id).toBe('user-123')
        expect(user.name).toBe('John')
        expect(user.email).toBe('john@example.com')
        expect(user.role).toBe(UserRole.STAFF)
        expect(user.isActive).toBe(true)

        // Optional properties should be undefined
        expect(user.username).toBeUndefined()
        expect(user.avatar).toBeUndefined()
        expect(user.firstName).toBeUndefined()
        expect(user.lastName).toBeUndefined()
        expect(user.displayName).toBeUndefined()
        expect(user.bio).toBeUndefined()
        expect(user.phone).toBeUndefined()
        expect(user.lastLogin).toBeUndefined()
        expect(user.updatedAt).toBeUndefined()
        expect(user.isFirstLogin).toBeUndefined()
        expect(user.langKey).toBeUndefined()
        expect(user.emailVerified).toBeUndefined()
        expect(user.lastActivity).toBeUndefined()
        expect(user.createdAt).toBeUndefined()
        expect(user.createdBy).toBeUndefined()
        expect(user.lastModifiedBy).toBeUndefined()
        expect(user.managedBy).toBeUndefined()
        expect(user.requiresPasswordChange).toBeUndefined()
      })
    })

    describe('hasRole', () => {
      const adminUser = new User('admin-123', 'Admin', 'admin@example.com', UserRole.ADMIN, true)
      const managerUser = new User('manager-123', 'Manager', 'manager@example.com', UserRole.MANAGER, true)
      const staffUser = new User('staff-123', 'Staff', 'staff@example.com', UserRole.STAFF, true)

      it('should return true when user has the specified role', () => {
        expect(adminUser.hasRole(UserRole.ADMIN)).toBe(true)
        expect(managerUser.hasRole(UserRole.MANAGER)).toBe(true)
        expect(staffUser.hasRole(UserRole.STAFF)).toBe(true)
      })

      it('should return false when user does not have the specified role', () => {
        expect(adminUser.hasRole(UserRole.MANAGER)).toBe(false)
        expect(managerUser.hasRole(UserRole.STAFF)).toBe(false)
        expect(staffUser.hasRole(UserRole.ADMIN)).toBe(false)
      })
    })

    describe('isAdmin', () => {
      it('should return true for admin users', () => {
        const adminUser = new User('admin-123', 'Admin', 'admin@example.com', UserRole.ADMIN, true)
        expect(adminUser.isAdmin()).toBe(true)
      })

      it('should return false for non-admin users', () => {
        const managerUser = new User('manager-123', 'Manager', 'manager@example.com', UserRole.MANAGER, true)
        const staffUser = new User('staff-123', 'Staff', 'staff@example.com', UserRole.STAFF, true)

        expect(managerUser.isAdmin()).toBe(false)
        expect(staffUser.isAdmin()).toBe(false)
      })
    })

    describe('isManagerOrHigher', () => {
      it('should return true for admin users', () => {
        const adminUser = new User('admin-123', 'Admin', 'admin@example.com', UserRole.ADMIN, true)
        expect(adminUser.isManagerOrHigher()).toBe(true)
      })

      it('should return true for manager users', () => {
        const managerUser = new User('manager-123', 'Manager', 'manager@example.com', UserRole.MANAGER, true)
        expect(managerUser.isManagerOrHigher()).toBe(true)
      })

      it('should return false for staff users', () => {
        const staffUser = new User('staff-123', 'Staff', 'staff@example.com', UserRole.STAFF, true)
        expect(staffUser.isManagerOrHigher()).toBe(false)
      })
    })

    describe('isActiveUser', () => {
      it('should return true for active users', () => {
        const activeUser = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true)
        expect(activeUser.isActiveUser()).toBe(true)
      })

      it('should return false for inactive users', () => {
        const inactiveUser = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, false)
        expect(inactiveUser.isActiveUser()).toBe(false)
      })
    })

    describe('needsPasswordChange', () => {
      it('should return true when isFirstLogin is true', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, true)

        expect(user.needsPasswordChange()).toBe(true)
      })

      it('should return false when isFirstLogin is false', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, false)

        expect(user.needsPasswordChange()).toBe(false)
      })

      it('should return false when isFirstLogin is undefined', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true)

        expect(user.needsPasswordChange()).toBe(false)
      })
    })

    describe('isEmailVerified', () => {
      it('should return true when emailVerified is true', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, true)

        expect(user.isEmailVerified()).toBe(true)
      })

      it('should return false when emailVerified is false', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, false)

        expect(user.isEmailVerified()).toBe(false)
      })

      it('should return false when emailVerified is undefined', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true)

        expect(user.isEmailVerified()).toBe(false)
      })
    })

    describe('getLanguage', () => {
      it('should return langKey when provided', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, 'fr')

        expect(user.getLanguage()).toBe('fr')
      })

      it('should return default "en" when langKey is not provided', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true)

        expect(user.getLanguage()).toBe('en')
      })

      it('should return default "en" when langKey is empty', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, '')

        expect(user.getLanguage()).toBe('en')
      })
    })

    describe('activateAccount', () => {
      it('should return domain event when account is not active', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, false)

        const event = user.activateAccount()

        expect(event).toEqual({
          type: 'UserActivated',
          userId: 'user-123'
        })
      })

      it('should throw error when account is already active', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true)

        expect(() => user.activateAccount()).toThrow('Account already activated')
      })
    })

    describe('recordFirstLogin', () => {
      it('should return domain event when isFirstLogin is true', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, true)

        const event = user.recordFirstLogin()

        expect(event).toEqual({
          type: 'UserFirstLoginRecorded',
          userId: 'user-123'
        })
      })

      it('should return domain event when isFirstLogin is undefined (defaults to true)', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true)

        const event = user.recordFirstLogin()

        expect(event).toEqual({
          type: 'UserFirstLoginRecorded',
          userId: 'user-123'
        })
      })

      it('should throw error when isFirstLogin is false', () => {
        const user = new User('user-123', 'User', 'user@example.com', UserRole.STAFF, true,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, false)

        expect(() => user.recordFirstLogin()).toThrow('First login already recorded')
      })
    })

    describe('fromObject', () => {
      it('should create User from valid object', () => {
        const obj = {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.STAFF,
          isActive: true,
          username: 'johndoe',
          avatar: 'avatar.jpg',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'Johnny',
          bio: 'Developer',
          phone: '+1234567890',
          lastLogin: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-10T10:00:00Z',
          isFirstLogin: false,
          langKey: 'en',
          emailVerified: true,
          lastActivity: '2024-01-14T10:00:00Z',
          createdAt: '2024-01-01T10:00:00Z',
          createdBy: 'admin',
          lastModifiedBy: 'admin',
          managedBy: 'manager',
          requiresPasswordChange: false,
        }

        const user = User.fromObject(obj)

        expect(user.id).toBe('user-123')
        expect(user.name).toBe('John Doe')
        expect(user.email).toBe('john@example.com')
        expect(user.role).toBe(UserRole.STAFF)
        expect(user.isActive).toBe(true)
        expect(user.username).toBe('johndoe')
        expect(user.lastLogin).toBeInstanceOf(Date)
        expect(user.createdAt).toBeInstanceOf(Date)
      })

      it('should provide fallback name when name is missing', () => {
        const obj = {
          id: 'user-123',
          email: 'john@example.com',
          role: UserRole.STAFF,
          isActive: true,
        }

        const user = User.fromObject(obj)

        expect(user.name).toBe('john') // email prefix fallback
      })

      it('should use displayName as fallback for name', () => {
        const obj = {
          id: 'user-123',
          email: 'john@example.com',
          role: UserRole.STAFF,
          isActive: true,
          displayName: 'Johnny',
        }

        const user = User.fromObject(obj)

        expect(user.name).toBe('Johnny')
      })

      it('should use username as fallback for name', () => {
        const obj = {
          id: 'user-123',
          email: 'john@example.com',
          role: UserRole.STAFF,
          isActive: true,
          username: 'johndoe',
        }

        const user = User.fromObject(obj)

        expect(user.name).toBe('johndoe')
      })

      it('should use email prefix as fallback for name', () => {
        const obj = {
          id: 'user-123',
          email: 'john.doe@example.com',
          role: UserRole.STAFF,
          isActive: true,
        }

        const user = User.fromObject(obj)

        expect(user.name).toBe('john.doe')
      })

      it('should convert id to string', () => {
        const obj = {
          id: 123,
          email: 'john@example.com',
          role: UserRole.STAFF,
          isActive: true,
        }

        const user = User.fromObject(obj)

        expect(user.id).toBe('123')
        expect(typeof user.id).toBe('string')
      })

      it('should set defaults for optional boolean fields', () => {
        const obj = {
          id: 'user-123',
          email: 'john@example.com',
          role: UserRole.STAFF,
        }

        const user = User.fromObject(obj)

        expect(user.isActive).toBe(false)
        expect(user.isFirstLogin).toBe(true)
        expect(user.emailVerified).toBe(false)
      })

      it('should throw error when id is missing', () => {
        const obj = {
          email: 'john@example.com',
          role: UserRole.STAFF,
          isActive: true,
        }

        expect(() => User.fromObject(obj)).toThrow('User object missing required id field')
      })

      it('should throw error when email is missing', () => {
        const obj = {
          id: 'user-123',
          role: UserRole.STAFF,
          isActive: true,
        }

        expect(() => User.fromObject(obj)).toThrow('User object missing required email field')
      })

      it('should throw error when role is missing', () => {
        const obj = {
          id: 'user-123',
          email: 'john@example.com',
          isActive: true,
        }

        expect(() => User.fromObject(obj)).toThrow('User object missing required role field')
      })
    })

    describe('toObject', () => {
      it('should convert User to plain object', () => {
        const lastLogin = new Date('2024-01-15T10:00:00Z')
        const createdAt = new Date('2024-01-01T10:00:00Z')

        const user = new User(
          'user-123',
          'John Doe',
          'john@example.com',
          UserRole.STAFF,
          true,
          'johndoe',
          'avatar.jpg',
          'John',
          'Doe',
          'Johnny',
          'Developer',
          '+1234567890',
          lastLogin,
          undefined,
          false,
          'en',
          true,
          undefined,
          createdAt,
          'admin',
          'admin',
          'manager',
          false
        )

        const obj = user.toObject()

        expect(obj).toEqual({
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.STAFF,
          isActive: true,
          username: 'johndoe',
          avatar: 'avatar.jpg',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'Johnny',
          bio: 'Developer',
          phone: '+1234567890',
          lastLogin: lastLogin.toISOString(),
          updatedAt: undefined,
          isFirstLogin: false,
          langKey: 'en',
          emailVerified: true,
          lastActivity: undefined,
          createdAt: createdAt.toISOString(),
          createdBy: 'admin',
          lastModifiedBy: 'admin',
          managedBy: 'manager',
          requiresPasswordChange: false,
        })
      })

      it('should handle undefined dates', () => {
        const user = new User('user-123', 'John', 'john@example.com', UserRole.STAFF, true)

        const obj = user.toObject()

        expect(obj.lastLogin).toBeUndefined()
        expect(obj.updatedAt).toBeUndefined()
        expect(obj.lastActivity).toBeUndefined()
        expect(obj.createdAt).toBeUndefined()
      })
    })
  })

  describe('UserRole Enum', () => {
    it('should have correct role values', () => {
      expect(UserRole.ADMIN).toBe('admin')
      expect(UserRole.MANAGER).toBe('manager')
      expect(UserRole.STAFF).toBe('staff')
    })
  })

  describe('AuthTokens Class', () => {
    describe('constructor', () => {
      it('should create auth tokens with all properties', () => {
        const expiresAt = new Date('2024-01-15T12:00:00Z')
        const tokens = new AuthTokens('access-token-123', 'refresh-token-456', expiresAt)

        expect(tokens.accessToken).toBe('access-token-123')
        expect(tokens.refreshToken).toBe('refresh-token-456')
        expect(tokens.expiresAt).toBe(expiresAt)
      })

      it('should create auth tokens with minimal properties', () => {
        const tokens = new AuthTokens('access-token-123')

        expect(tokens.accessToken).toBe('access-token-123')
        expect(tokens.refreshToken).toBeUndefined()
        expect(tokens.expiresAt).toBeUndefined()
      })
    })

    describe('isExpired', () => {
      it('should return false when expiresAt is not set', () => {
        const tokens = new AuthTokens('access-token-123')

        expect(tokens.isExpired()).toBe(false)
      })

      it('should return false when token is not expired', () => {
        const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
        const tokens = new AuthTokens('access-token-123', 'refresh-token-456', futureDate)

        expect(tokens.isExpired()).toBe(false)
      })

      it('should return true when token is expired', () => {
        const pastDate = new Date(Date.now() - 3600000) // 1 hour ago
        const tokens = new AuthTokens('access-token-123', 'refresh-token-456', pastDate)

        expect(tokens.isExpired()).toBe(true)
      })
    })

    describe('hasRefreshToken', () => {
      it('should return true when refresh token is present', () => {
        const tokens = new AuthTokens('access-token-123', 'refresh-token-456')

        expect(tokens.hasRefreshToken()).toBe(true)
      })

      it('should return false when refresh token is not present', () => {
        const tokens = new AuthTokens('access-token-123')

        expect(tokens.hasRefreshToken()).toBe(false)
      })

      it('should return false when refresh token is empty string', () => {
        const tokens = new AuthTokens('access-token-123', '')

        expect(tokens.hasRefreshToken()).toBe(false)
      })
    })
  })

  describe('AuthResult Class', () => {
    const mockUser = new User('user-123', 'John', 'john@example.com', UserRole.STAFF, true)
    const mockTokens = new AuthTokens('access-token-123', 'refresh-token-456')

    describe('constructor', () => {
      it('should create authenticated result', () => {
        const result = new AuthResult(mockUser, mockTokens, true)

        expect(result.user).toBe(mockUser)
        expect(result.tokens).toBe(mockTokens)
        expect(result.isAuthenticated).toBe(true)
      })

      it('should create unauthenticated result with default isAuthenticated', () => {
        const result = new AuthResult(mockUser, mockTokens)

        expect(result.user).toBe(mockUser)
        expect(result.tokens).toBe(mockTokens)
        expect(result.isAuthenticated).toBe(true)
      })
    })

    describe('authenticated static method', () => {
      it('should create authenticated result', () => {
        const result = AuthResult.authenticated(mockUser, mockTokens)

        expect(result.user).toBe(mockUser)
        expect(result.tokens).toBe(mockTokens)
        expect(result.isAuthenticated).toBe(true)
      })
    })

    describe('unauthenticated static method', () => {
      it('should create unauthenticated result with guest user', () => {
        const result = AuthResult.unauthenticated()

        expect(result.user).toBeInstanceOf(User)
        expect(result.user.id).toBe('')
        expect(result.user.name).toBe('Guest')
        expect(result.user.email).toBe('')
        expect(result.user.role).toBe(UserRole.STAFF)
        expect(result.user.isActive).toBe(false)

        expect(result.tokens).toBeInstanceOf(AuthTokens)
        expect(result.tokens.accessToken).toBe('')
        expect(result.tokens.refreshToken).toBe('')
        expect(result.tokens.expiresAt).toBeUndefined()

        expect(result.isAuthenticated).toBe(false)
      })
    })
  })
})
