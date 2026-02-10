/**
 * Base DTO Class
 * All DTOs should extend this class for consistent behavior
 */
export class BaseDto {
  /**
   * Convert DTO to plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return { ...this };
  }

  /**
   * Create DTO from plain object
   * @param {Object} data - Plain object data
   * @returns {BaseDto} New DTO instance
   */
  static fromObject(data) {
    return new this(data);
  }

  /**
   * Validate DTO data
   * Override in subclasses for specific validation
   * @returns {boolean} True if valid
   */
  validate() {
    return true;
  }
}

export default BaseDto;
