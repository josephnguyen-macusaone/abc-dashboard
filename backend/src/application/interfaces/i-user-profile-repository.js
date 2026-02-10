/**
 * User Profile Repository Interface
 * Defines the contract for user profile data access operations
 */

/**
 * @interface IUserProfileRepository
 */
export class IUserProfileRepository {
  /**
   * Find profile by ID
   * @param {string} id - Profile ID
   * @returns {Promise<Object|null>} Profile entity or null
   */
  async findById(id) {
    throw new Error('Method not implemented: findById');
  }

  /**
   * Find profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Profile entity or null
   */
  async findByUserId(userId) {
    throw new Error('Method not implemented: findByUserId');
  }

  /**
   * Create new profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Created profile entity
   */
  async create(profileData) {
    throw new Error('Method not implemented: create');
  }

  /**
   * Update profile by user ID
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated profile or null
   */
  async update(userId, updates) {
    throw new Error('Method not implemented: update');
  }

  /**
   * Delete profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(userId) {
    throw new Error('Method not implemented: delete');
  }

  /**
   * Record user login
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated profile
   */
  async recordLogin(userId) {
    throw new Error('Method not implemented: recordLogin');
  }

  /**
   * Update last activity timestamp
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated profile
   */
  async updateLastActivity(userId) {
    throw new Error('Method not implemented: updateLastActivity');
  }

  /**
   * Verify email for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated profile
   */
  async verifyEmail(userId) {
    throw new Error('Method not implemented: verifyEmail');
  }
}

export default IUserProfileRepository;
