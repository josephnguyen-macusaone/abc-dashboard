/**
 * User Repository Interface
 * Defines the contract for user data access operations
 */

/**
 * @interface IUserRepository
 */
export class IUserRepository {
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User entity or null
   */
  async findById(id) {
    throw new Error('Method not implemented: findById');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User entity or null
   */
  async findByEmail(email) {
    throw new Error('Method not implemented: findByEmail');
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User entity or null
   */
  async findByUsername(username) {
    throw new Error('Method not implemented: findByUsername');
  }

  /**
   * Find all users with pagination and filters
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {Object} options.filters - Filter criteria
   * @param {string} options.sortBy - Sort field
   * @param {string} options.sortOrder - Sort direction (asc/desc)
   * @returns {Promise<{ users: Object[], total: number }>}
   */
  async findAll(options) {
    throw new Error('Method not implemented: findAll');
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user entity
   */
  async create(userData) {
    throw new Error('Method not implemented: create');
  }

  /**
   * Update user by ID
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated user or null
   */
  async update(id, updates) {
    throw new Error('Method not implemented: update');
  }

  /**
   * Delete user by ID
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    throw new Error('Method not implemented: delete');
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {string} excludeId - Optional user ID to exclude
   * @returns {Promise<boolean>} True if exists
   */
  async emailExists(email, excludeId) {
    throw new Error('Method not implemented: emailExists');
  }

  /**
   * Check if username exists
   * @param {string} username - Username to check
   * @param {string} excludeId - Optional user ID to exclude
   * @returns {Promise<boolean>} True if exists
   */
  async usernameExists(username, excludeId) {
    throw new Error('Method not implemented: usernameExists');
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getStats() {
    throw new Error('Method not implemented: getStats');
  }
}

export default IUserRepository;
