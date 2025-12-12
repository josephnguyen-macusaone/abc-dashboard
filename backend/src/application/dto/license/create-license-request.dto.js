/**
 * Create License Request DTO
 * Represents license creation request payload
 */
import { BaseDto } from '../common/base.dto.js';

export class CreateLicenseRequestDto extends BaseDto {
  constructor({
    key,
    product,
    plan,
    status,
    term,
    seatsTotal,
    startsAt,
    expiresAt,
    dba,
    zip,
    notes,
    createdBy,
  }) {
    super();
    this.key = key;
    this.product = product;
    this.plan = plan;
    this.status = status || 'pending';
    this.term = term || 'monthly';
    this.seatsTotal = seatsTotal || 1;
    this.startsAt = startsAt;
    this.expiresAt = expiresAt;
    this.dba = dba;
    this.zip = zip;
    this.notes = notes;
    this.createdBy = createdBy;
  }

  /**
   * Create from HTTP request body
   * @param {Object} body - Request body
   * @param {string} userId - User ID creating the license
   * @returns {CreateLicenseRequestDto}
   */
  static fromRequest(body, userId) {
    return new CreateLicenseRequestDto({
      key: body.key,
      product: body.product,
      plan: body.plan,
      status: body.status,
      term: body.term,
      seatsTotal: body.seatsTotal,
      startsAt: body.startsAt,
      expiresAt: body.expiresAt,
      dba: body.dba,
      zip: body.zip,
      notes: body.notes,
      createdBy: userId,
    });
  }
}

export default CreateLicenseRequestDto;
