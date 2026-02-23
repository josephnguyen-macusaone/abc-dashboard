/**
 * Domain Entity: License
 * Represents a software license in the business domain
 *
 * Business Rules:
 * - License must have valid DBA and plan
 * - Status transitions must follow business rules
 * - Expiration dates must be calculated based on term
 * - Seats usage cannot exceed total seats
 * - SMS balance cannot go negative
 */

// Domain Enums (active, cancel only)
export type LicenseStatus = 'active' | 'cancel';

export type LicenseTerm = 'monthly' | 'yearly';

// Domain Value Objects
export class LicenseId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('License ID cannot be empty');
    }
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: LicenseId): boolean {
    return this.value === other.value;
  }
}

export class Money {
  constructor(private readonly amount: number) {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
  }

  public getAmount(): number {
    return this.amount;
  }

  public add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  public subtract(other: Money): Money {
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Cannot subtract more than available amount');
    }
    return new Money(result);
  }

  public multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Multiplication factor cannot be negative');
    }
    return new Money(this.amount * factor);
  }
}

export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date
  ) {
    if (start >= end) {
      throw new Error('Start date must be before end date');
    }
  }

  public contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  public isExpired(now: Date = new Date()): boolean {
    return now > this.end;
  }

  public daysUntilExpiration(now: Date = new Date()): number {
    const diffTime = this.end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public isExpiringSoon(daysThreshold: number = 30, now: Date = new Date()): boolean {
    return this.daysUntilExpiration(now) <= daysThreshold && !this.isExpired(now);
  }
}

// Domain Events
export interface LicenseCreatedEvent {
  type: 'LicenseCreated';
  licenseId: string;
  dba: string;
  plan: string;
}

export interface LicenseActivatedEvent {
  type: 'LicenseActivated';
  licenseId: string;
  activatedAt: Date;
}

export interface LicenseExpiredEvent {
  type: 'LicenseExpired';
  licenseId: string;
  expiredAt: Date;
}

export interface LicenseCancelledEvent {
  type: 'LicenseCancelled';
  licenseId: string;
  cancelledAt: Date;
  reason?: string;
}

export type LicenseDomainEvent =
  | LicenseCreatedEvent
  | LicenseActivatedEvent
  | LicenseExpiredEvent
  | LicenseCancelledEvent;

// Main License Entity
export class License {
  private _domainEvents: LicenseDomainEvent[] = [];

  constructor(
    private readonly _id: LicenseId,
    private _dba: string,
    private _zip: string,
    private _startsAt: Date,
    private _status: LicenseStatus,
    private _plan: string,
    private _term: LicenseTerm,
    private _seatsTotal: number,
    private _seatsUsed: number,
    private _lastPayment: Money,
    private _lastActive: Date,
    private _smsPurchased: number,
    private _smsSent: number,
    private _agents: number,
    private _agentsName: string,
    private _agentsCost: Money,
    private _notes: string,
    private _key?: string,
    private _product?: string,
    private _cancelDate?: Date,
    private _createdAt?: Date,
    private _updatedAt?: Date,
    private readonly _smsBalanceStored?: number
  ) {
    this.validateBusinessRules();
  }

  // Getters
  public get id(): LicenseId { return this._id; }
  public get dba(): string { return this._dba; }
  public get zip(): string { return this._zip; }
  public get startsAt(): Date { return this._startsAt; }
  public get status(): LicenseStatus { return this._status; }
  public get plan(): string { return this._plan; }
  public get term(): LicenseTerm { return this._term; }
  public get seatsTotal(): number { return this._seatsTotal; }
  public get seatsUsed(): number { return this._seatsUsed; }
  public get lastPayment(): Money { return this._lastPayment; }
  public get lastActive(): Date { return this._lastActive; }
  public get smsPurchased(): number { return this._smsPurchased; }
  public get smsSent(): number { return this._smsSent; }
  /** Use stored smsBalance from API when valid; else compute from smsPurchased - smsSent */
  public get smsBalance(): number {
    const stored = this._smsBalanceStored;
    if (stored !== undefined && stored !== null && !Number.isNaN(Number(stored))) {
      return Number(stored);
    }
    return this._smsPurchased - this._smsSent;
  }
  public get agents(): number { return this._agents; }
  public get agentsName(): string { return this._agentsName; }
  public get agentsCost(): Money { return this._agentsCost; }
  public get notes(): string { return this._notes; }
  public get key(): string | undefined { return this._key; }
  public get product(): string | undefined { return this._product; }
  public get cancelDate(): Date | undefined { return this._cancelDate; }
  public get createdAt(): Date | undefined { return this._createdAt; }
  public get updatedAt(): Date | undefined { return this._updatedAt; }

  // Business Methods

  /**
   * Check if license can be activated (only cancelled licenses can be reactivated)
   */
  public canBeActivated(): boolean {
    return this._status === 'cancel';
  }

  /**
   * Activate the license
   */
  public activate(): LicenseActivatedEvent {
    if (!this.canBeActivated()) {
      throw new Error(`Cannot activate license in status: ${this._status}`);
    }

    this._status = 'active';
    this._updatedAt = new Date();

    const event: LicenseActivatedEvent = {
      type: 'LicenseActivated',
      licenseId: this._id.toString(),
      activatedAt: new Date()
    };

    this._domainEvents.push(event);
    return event;
  }

  /**
   * Check if license is expired
   */
  public isExpired(now: Date = new Date()): boolean {
    const expirationDate = this.calculateExpirationDate();
    return now > expirationDate;
  }

  /**
   * Check if license is expiring soon
   */
  public isExpiringSoon(daysThreshold: number = 30, now: Date = new Date()): boolean {
    const expirationDate = this.calculateExpirationDate();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= daysThreshold && daysUntilExpiration > 0;
  }

  /**
   * Calculate expiration date based on term
   */
  public calculateExpirationDate(): Date {
    const expirationDate = new Date(this._startsAt);

    switch (this._term) {
      case 'monthly':
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        break;
      case 'yearly':
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        break;
      default:
        throw new Error(`Unknown license term: ${this._term}`);
    }

    return expirationDate;
  }

  /**
   * Check if license has available seats
   */
  public hasAvailableSeats(): boolean {
    return this._seatsUsed < this._seatsTotal;
  }

  /**
   * Use a seat (increment seats used)
   */
  public useSeat(): void {
    if (!this.hasAvailableSeats()) {
      throw new Error('No available seats remaining');
    }
    this._seatsUsed++;
    this._updatedAt = new Date();
  }

  /**
   * Release a seat (decrement seats used)
   */
  public releaseSeat(): void {
    if (this._seatsUsed <= 0) {
      throw new Error('No seats are currently used');
    }
    this._seatsUsed--;
    this._updatedAt = new Date();
  }

  /**
   * Update seats total
   */
  public updateSeatsTotal(newTotal: number): void {
    if (newTotal < 0) {
      throw new Error('Seats total cannot be negative');
    }
    if (newTotal < this._seatsUsed) {
      throw new Error('Cannot reduce seats total below currently used seats');
    }
    this._seatsTotal = newTotal;
    this._updatedAt = new Date();
  }

  /**
   * Send SMS (decrement balance)
   */
  public sendSms(count: number = 1): void {
    if (count <= 0) {
      throw new Error('SMS count must be positive');
    }
    if (this.smsBalance < count) {
      throw new Error('Insufficient SMS balance');
    }
    this._smsSent += count;
    this._updatedAt = new Date();
  }

  /**
   * Purchase SMS (increment purchased)
   */
  public purchaseSms(count: number): void {
    if (count <= 0) {
      throw new Error('Purchase count must be positive');
    }
    this._smsPurchased += count;
    this._updatedAt = new Date();
  }

  /**
   * Cancel license
   */
  public cancel(reason?: string): LicenseCancelledEvent {
    if (this._status === 'cancel') {
      throw new Error(`Cannot cancel license in status: ${this._status}`);
    }

    this._status = 'cancel';
    this._cancelDate = new Date();
    this._updatedAt = new Date();

    const event: LicenseCancelledEvent = {
      type: 'LicenseCancelled',
      licenseId: this._id.toString(),
      cancelledAt: this._cancelDate,
      reason
    };

    this._domainEvents.push(event);
    return event;
  }

  /**
   * Update last active timestamp
   */
  public recordActivity(): void {
    this._lastActive = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Update payment amount
   */
  public updatePayment(amount: Money): void {
    this._lastPayment = amount;
    this._updatedAt = new Date();
  }

  /**
   * Get domain events and clear them
   */
  public pullDomainEvents(): LicenseDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(): void {
    if (!this._dba || this._dba.trim().length === 0) {
      throw new Error('DBA is required');
    }

    if (!this._plan || this._plan.trim().length === 0) {
      throw new Error('Plan is required');
    }

    if (this._seatsTotal < 0) {
      throw new Error('Seats total cannot be negative');
    }

    if (this._seatsUsed < 0) {
      throw new Error('Seats used cannot be negative');
    }

    if (this._seatsUsed > this._seatsTotal) {
      throw new Error('Seats used cannot exceed seats total');
    }

    if (this._smsPurchased < 0) {
      throw new Error('SMS purchased cannot be negative');
    }

    if (this._smsSent < 0) {
      throw new Error('SMS sent cannot be negative');
    }

    if (this._smsSent > this._smsPurchased) {
      throw new Error('SMS sent cannot exceed SMS purchased');
    }

    if (this._agents < 0) {
      throw new Error('Agents count cannot be negative');
    }

    if (this._status === 'cancel' && !this._cancelDate) {
      throw new Error('Cancel date is required when status is cancel');
    }
  }

  // Factory Methods

  /**
   * Create a new license
   */
  public static create(props: CreateLicenseProps): { license: License; event: LicenseCreatedEvent } {
    const id = new LicenseId(props.id || crypto.randomUUID());
    const now = new Date();

    const license = new License(
      id,
      props.dba,
      props.zip,
      new Date(props.startsAt),
      'active', // New licenses start as active
      props.plan,
      props.term,
      props.seatsTotal || 1,
      0, // seatsUsed starts at 0
      new Money(props.lastPayment || 0),
      now, // lastActive
      props.smsPurchased || 0,
      0, // smsSent starts at 0
      props.agents || 0,
      props.agentsName || '',
      new Money(props.agentsCost || 0),
      props.notes || '',
      props.key,
      props.product,
      undefined, // cancelDate
      now, // createdAt
      now  // updatedAt
    );

    const event: LicenseCreatedEvent = {
      type: 'LicenseCreated',
      licenseId: id.toString(),
      dba: props.dba,
      plan: props.plan
    };

    license._domainEvents.push(event);

    return { license, event };
  }

  /**
   * Create license from persistence data
   */
  public static fromPersistence(props: PersistenceLicenseProps): License {
    return new License(
      new LicenseId(props.id),
      props.dba,
      props.zip,
      new Date(props.startsAt),
      props.status,
      props.plan,
      props.term,
      props.seatsTotal || 1,
      props.seatsUsed || 0,
      new Money(props.lastPayment || 0),
      new Date(props.lastActive),
      props.smsPurchased || 0,
      props.smsSent || 0,
      props.agents || 0,
      props.agentsName || '',
      new Money(props.agentsCost || 0),
      props.notes || '',
      props.key,
      props.product,
      props.cancelDate ? new Date(props.cancelDate) : undefined,
      props.createdAt ? new Date(props.createdAt) : undefined,
      props.updatedAt ? new Date(props.updatedAt) : undefined,
      props.smsBalance
    );
  }

  /**
   * Convert to persistence format
   */
  public toPersistence(): PersistenceLicenseProps {
    return {
      id: this._id.toString(),
      key: this._key,
      product: this._product,
      dba: this._dba,
      zip: this._zip,
      startsAt: this._startsAt.toISOString(),
      status: this._status,
      cancelDate: this._cancelDate?.toISOString(),
      plan: this._plan,
      term: this._term,
      seatsTotal: this._seatsTotal,
      seatsUsed: this._seatsUsed,
      lastPayment: this._lastPayment.getAmount(),
      lastActive: this._lastActive.toISOString(),
      smsPurchased: this._smsPurchased,
      smsSent: this._smsSent,
      agents: this._agents,
      agentsName: this._agentsName,
      agentsCost: this._agentsCost.getAmount(),
      notes: this._notes,
      createdAt: this._createdAt?.toISOString(),
      updatedAt: this._updatedAt?.toISOString()
    };
  }
}

// Types for factory methods
export interface CreateLicenseProps {
  id?: string;
  dba: string;
  zip: string;
  startsAt: string | Date;
  plan: string;
  term: LicenseTerm;
  seatsTotal?: number;
  lastPayment?: number;
  smsPurchased?: number;
  agents?: number;
  agentsName?: string;
  agentsCost?: number;
  notes?: string;
  key?: string;
  product?: string;
}

export interface PersistenceLicenseProps {
  id: string;
  key?: string;
  product?: string;
  dba: string;
  zip: string;
  startsAt: string;
  status: LicenseStatus;
  cancelDate?: string;
  plan: string;
  term: LicenseTerm;
  seatsTotal?: number;
  seatsUsed?: number;
  lastPayment?: number;
  lastActive: string;
  smsPurchased?: number;
  smsSent?: number;
  smsBalance?: number;
  agents?: number;
  agentsName?: string;
  agentsCost?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

