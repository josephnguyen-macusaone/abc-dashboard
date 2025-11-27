/**
 * UserProfile Repository Interface
 * Defines the contract for user profile data operations
 */
export class IUserProfileRepository {
  /**
   * Find user profile by ID
   * @param {string} id - Profile ID
   * @returns {Promise<UserProfile|null>} UserProfile entity or null
   */
  async findById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Find user profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<UserProfile|null>} UserProfile entity or null
   */
  async findByUserId(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Save user profile
   * @param {UserProfile} userProfile - UserProfile entity
   * @returns {Promise<UserProfile>} Saved user profile entity
   */
  async save(userProfile) {
    throw new Error('Method not implemented');
  }

  /**
   * Update user profile
   * @param {string} id - Profile ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<UserProfile>} Updated user profile entity
   */
  async update(id, updates) {
    throw new Error('Method not implemented');
  }

  /**
   * Update user profile by user ID
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<UserProfile>} Updated user profile entity
   */
  async updateByUserId(userId, updates) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete user profile
   * @param {string} id - Profile ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete user profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteByUserId(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Record login activity for user profile
   * @param {string} userId - User ID
   * @returns {Promise<UserProfile>} Updated user profile entity
   */
  async recordLogin(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Record activity for user profile
   * @param {string} userId - User ID
   * @returns {Promise<UserProfile>} Updated user profile entity
   */
  async recordActivity(userId) {
    throw new Error('Method not implemented');
  }

  /**
   * Verify email for user profile
   * @param {string} userId - User ID
   * @returns {Promise<UserProfile>} Updated user profile entity
   */
  async verifyEmail(userId) {
    throw new Error('Method not implemented');
  }
}
