/**
 * License Response DTO
 * Represents a license in API responses
 */
import { BaseDto } from '../common/base.dto.js';

export class LicenseResponseDto extends BaseDto {
  constructor({
    // Identity
    id,
    key,

    // Product & Service
    product,
    plan,
    status,
    term,

    // Capacity & Usage
    seatsTotal,
    seatsUsed,
    agents,
    agentsName,

    // Financial
    lastPayment,
    smsPurchased,
    smsSent,
    smsBalance,
    agentsCost,

    // Location
    dba,
    zip,

    // Dates & Timeline
    startsAt,
    expiresAt,
    cancelDate,
    lastActive,

    // Content
    notes,

    // Audit
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,

    // Computed properties
    utilizationPercent,
    availableSeats,
    isActive,
    isExpired,
    isExpiringSoon,
    canAssign,
    statusDisplay,

    // External sync fields (unified)
    appid,
    countid,
    mid,
    license_type,
    package_data,
    sendbat_workspace,
    coming_expired,
    external_sync_status,
    last_external_sync,
    external_sync_error,
  }) {
    super();

    // Identity
    this.id = id;
    this.key = key;

    // Product & Service
    this.product = product;
    this.plan = plan;
    this.status = status;
    this.term = term;

    // Capacity & Usage
    this.seatsTotal = seatsTotal;
    this.seatsUsed = seatsUsed;
    this.agents = agents;
    this.agentsName = agentsName;

    // Financial
    this.lastPayment = lastPayment;
    this.smsPurchased = smsPurchased;
    this.smsSent = smsSent;
    this.smsBalance = smsBalance;
    this.agentsCost = agentsCost;

    // Location
    this.dba = dba;
    this.zip = zip;

    // Dates & Timeline
    this.startsAt = startsAt;
    this.expiresAt = expiresAt;
    this.cancelDate = cancelDate;
    this.lastActive = lastActive;

    // Content
    this.notes = notes;

    // Audit
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    // Computed properties
    this.utilizationPercent = utilizationPercent;
    this.availableSeats = availableSeats;
    this.isActive = isActive;
    this.isExpired = isExpired;
    this.isExpiringSoon = isExpiringSoon;
    this.canAssign = canAssign;
    this.statusDisplay = statusDisplay;

    // External sync fields (unified)
    this.appid = appid;
    this.countid = countid;
    this.mid = mid;
    this.license_type = license_type;
    this.package_data = package_data;
    this.sendbat_workspace = sendbat_workspace;
    this.coming_expired = coming_expired;
    this.external_sync_status = external_sync_status;
    this.last_external_sync = last_external_sync;
    this.external_sync_error = external_sync_error;
  }

  /**
   * Create from License entity
   * @param {License} entity - License domain entity
   * @returns {LicenseResponseDto}
   */
  static fromEntity(entity) {
    const json = entity.toJSON();
    return new LicenseResponseDto({
      // Identity
      id: json.id,
      key: json.key,

      // Product & Service
      product: json.product,
      plan: json.plan,
      status: json.status,
      term: json.term,

      // Capacity & Usage
      seatsTotal: json.seatsTotal,
      seatsUsed: json.seatsUsed,
      agents: json.agents,
      agentsName: json.agentsName,

      // Financial
      lastPayment: json.lastPayment,
      smsPurchased: json.smsPurchased,
      smsSent: json.smsSent,
      smsBalance: json.smsBalance,
      agentsCost: json.agentsCost,

      // Location
      dba: json.dba,
      zip: json.zip,

      // Dates & Timeline
      startsAt: json.startsAt,
      expiresAt: json.expiresAt,
      cancelDate: json.cancelDate,
      lastActive: json.lastActive,

      // Content
      notes: json.notes,

      // Audit
      createdBy: json.createdBy,
      updatedBy: json.updatedBy,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,

      // Computed properties
      utilizationPercent: json.utilizationPercent,
      availableSeats: json.availableSeats,
      isActive: json.isActive,
      isExpired: json.isExpired,
      isExpiringSoon: json.isExpiringSoon,
      canAssign: json.canAssign,
      statusDisplay: json.statusDisplay,

      // External sync fields (unified)
      appid: json.appid,
      countid: json.countid,
      mid: json.mid,
      license_type: json.license_type,
      package_data: json.package_data,
      sendbat_workspace: json.sendbat_workspace,
      coming_expired: json.coming_expired,
      external_sync_status: json.external_sync_status,
      last_external_sync: json.last_external_sync,
      external_sync_error: json.external_sync_error,
    });
  }
}

export default LicenseResponseDto;
