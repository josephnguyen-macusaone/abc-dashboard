/**
 * Create User Use Case
 * Handles user creation by administrators
 */
import logger from '../../../infrastructure/config/logger.js';

export class CreateUserUseCase {
  constructor(userRepository, authService) {
    this.userRepository = userRepository;
    this.authService = authService;
  }

  async execute({ username, hashedPassword, email, displayName, avatarUrl, avatarId, bio, phone }, createdBy) {
    try {
      // Validate input
      if (!username || !hashedPassword || !email || !displayName) {
        throw new Error('Required fields are missing');
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Check if username already exists
      const existingUsername = await this.userRepository.findByUsername(username);
      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Create user entity
      const user = await this.userRepository.save({
        username,
        hashedPassword,
        email,
        displayName,
        avatarUrl,
        avatarId,
        bio,
        phone
      });

      // Log the creation
      logger.info('User created', {
        userId: user.id,
        createdBy,
        email: user.email,
        username: user.username
      });

      // Return user data (without sensitive information)
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          avatarId: user.avatarId,
          bio: user.bio,
          phone: user.phone,
          createdAt: user.createdAt
        },
        message: 'User created successfully.'
      };
    } catch (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }
}
