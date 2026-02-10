/**
 * User Repository Interface
 * Defines the contract for user data operations
 */
export class IUserRepository {
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User entity or null
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User entity or null
   */
  async findByEmail(email) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by username
   * @param {string} username - User username
   * @returns {Promise<User|null>} User entity or null
   */
  async findByUsername(username) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user by email verification token
   * @param {string} token - Verification token
   * @returns {Promise<User|null>} User entity or null
   */
  async findByEmailVerificationToken(token) {
    throw new Error('Method not implemented');
  }

  /**
   * Update user's email verification fields
   * @param {string} userId - User ID
   * @param {Object} verificationData - Verification data
   * @returns {Promise<User>} Updated user entity
   */
  async updateEmailVerification(userId, verificationData) {
    throw new Error('Method not implemented');
  }

  /**
   * Find users with pagination and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Items per page
   * @param {Object} options.filters - Filter criteria
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort order ('asc'|'desc')
   * @returns {Promise<{users: User[], total: number, page: number, totalPages: number}>}
   */
  async findUsers(options = {}) {
    throw new Error('Method not implemented');
  }

  /**
   * Save user
   * @param {User} user - User entity
   * @returns {Promise<User>} Saved user entity
   */
  async save(user) {
    throw new Error('Method not implemented');
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<User>} Updated user entity
   */
  async update(id, updates) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {string} excludeId - User ID to exclude from check
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(email, excludeId = null) {
    throw new Error('Method not implemented');
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    throw new Error('Method not implemented');
  }
}
