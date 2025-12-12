/**
 * License Response DTO
 * Represents a license in API responses
 */
import { BaseDto } from '../common/base.dto.js';

export class LicenseResponseDto extends BaseDto {
  constructor({
    id,
    key,
    product,
    plan,
    status,
    term,
    seatsTotal,
    seatsUsed,
    utilizationPercent,
    availableSeats,
    startsAt,
    expiresAt,
    cancelDate,
    lastActive,
    dba,
    zip,
    lastPayment,
    smsPurchased,
    smsSent,
    smsBalance,
    agents,
    agentsName,
    agentsCost,
    notes,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
    isActive,
    isExpired,
    isExpiringSoon,
    canAssign,
    statusDisplay,
  }) {
    super();
    this.id = id;
    this.key = key;
    this.product = product;
    this.plan = plan;
    this.status = status;
    this.term = term;
    this.seatsTotal = seatsTotal;
    this.seatsUsed = seatsUsed;
    this.utilizationPercent = utilizationPercent;
    this.availableSeats = availableSeats;
    this.startsAt = startsAt;
    this.expiresAt = expiresAt;
    this.cancelDate = cancelDate;
    this.lastActive = lastActive;
    this.dba = dba;
    this.zip = zip;
    this.lastPayment = lastPayment;
    this.smsPurchased = smsPurchased;
    this.smsSent = smsSent;
    this.smsBalance = smsBalance;
    this.agents = agents;
    this.agentsName = agentsName;
    this.agentsCost = agentsCost;
    this.notes = notes;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.isActive = isActive;
    this.isExpired = isExpired;
    this.isExpiringSoon = isExpiringSoon;
    this.canAssign = canAssign;
    this.statusDisplay = statusDisplay;
  }

  /**
   * Create from License entity
   * @param {License} entity - License domain entity
   * @returns {LicenseResponseDto}
   */
  static fromEntity(entity) {
    const json = entity.toJSON();
    return new LicenseResponseDto({
      id: json.id,
      key: json.key,
      product: json.product,
      plan: json.plan,
      status: json.status,
      term: json.term,
      seatsTotal: json.seatsTotal,
      seatsUsed: json.seatsUsed,
      utilizationPercent: json.utilizationPercent,
      availableSeats: json.availableSeats,
      startsAt: json.startsAt,
      expiresAt: json.expiresAt,
      cancelDate: json.cancelDate,
      lastActive: json.lastActive,
      dba: json.dba,
      zip: json.zip,
      lastPayment: json.lastPayment,
      smsPurchased: json.smsPurchased,
      smsSent: json.smsSent,
      smsBalance: json.smsBalance,
      agents: json.agents,
      agentsName: json.agentsName,
      agentsCost: json.agentsCost,
      notes: json.notes,
      createdBy: json.createdBy,
      updatedBy: json.updatedBy,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      isActive: json.isActive,
      isExpired: json.isExpired,
      isExpiringSoon: json.isExpiringSoon,
      canAssign: json.canAssign,
      statusDisplay: json.statusDisplay,
    });
  }
}

export default LicenseResponseDto;
