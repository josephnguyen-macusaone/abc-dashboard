/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by tracking failure rates and temporarily stopping requests
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time in ms before trying half-open state
  monitoringPeriod: number; // Time window in ms to track failures
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'closed';
  private nextAttemptTime = 0;

  constructor(
    private config: CircuitBreakerConfig,
    private onStateChange?: (state: CircuitState) => void
  ) {}

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'half-open';
        this.onStateChange?.('half-open');
      } else {
        throw new Error(`Circuit breaker is open. Next attempt at ${new Date(this.nextAttemptTime).toISOString()}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.onStateChange?.('closed');
    }
  }

  /**
   * Handle failed operation. Only 5xx server errors count toward opening the circuit.
   * 4xx client errors (bad input, duplicate email, auth failures, etc.) are not server
   * failures and must not trip the circuit breaker.
   */
  private onFailure(error?: unknown): void {
    const status = error && typeof error === 'object' && 'status' in error
      ? (error as { status: number }).status
      : undefined;
    // Skip non-server errors: defined 4xx status codes are client mistakes, not outages.
    if (status !== undefined && status < 500) return;

    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      this.onStateChange?.('open');
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.nextAttemptTime = 0;
    this.onStateChange?.('closed');
  }

  /**
   * Force circuit open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    this.onStateChange?.('open');
  }

  /**
   * Get circuit breaker stats
   */
  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      timeUntilNextAttempt: Math.max(0, this.nextAttemptTime - Date.now())
    };
  }
}

/**
 * Create a circuit breaker with default config for API operations
 */
export function createApiCircuitBreaker(onStateChange?: (state: CircuitState) => void): CircuitBreaker {
  const config: CircuitBreakerConfig = {
    failureThreshold: 3, // Open after 3 failures
    recoveryTimeout: 30000, // Try again after 30 seconds
    monitoringPeriod: 60000 // Track failures over 1 minute
  };

  return new CircuitBreaker(config, onStateChange);
}