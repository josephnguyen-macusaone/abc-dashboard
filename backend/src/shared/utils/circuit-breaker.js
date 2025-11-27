/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by temporarily stopping calls to failing services
 */

import logger from '../../infrastructure/config/logger.js';
import { ExternalServiceUnavailableException } from '../../domain/exceptions/domain.exception.js';

/**
 * Circuit Breaker States
 */
export const CircuitState = {
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Service is failing, reject all calls
  HALF_OPEN: 'HALF_OPEN'  // Testing if service has recovered
};

/**
 * Circuit Breaker Configuration
 */
const DEFAULT_CONFIG = {
  failureThreshold: 5,      // Number of failures before opening circuit
  recoveryTimeout: 60000,   // Time in ms before trying to close circuit (1 minute)
  monitoringPeriod: 10000,  // Time window for failure counting (10 seconds)
  successThreshold: 3,      // Number of successes needed to close circuit from half-open
  name: 'default'           // Circuit breaker name for logging
};

/**
 * Circuit Breaker Class
 * Implements the circuit breaker pattern for external service calls
 */
export class CircuitBreaker {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.callCount = 0;
    this.failureHistory = [];
    this.correlationId = config.correlationId || `${this.config.name}_cb_${Date.now()}`;

    // Initialize metrics
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      stateChanges: []
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {Object} context - Additional context for logging
   */
  async execute(fn, context = {}) {
    this.metrics.totalCalls++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this._shouldAttemptReset()) {
        this._transitionTo(CircuitState.HALF_OPEN);
      } else {
        this.metrics.rejectedCalls++;
        throw new ExternalServiceUnavailableException(
          `${this.config.name} service (circuit breaker open)`
        );
      }
    }

    // Execute the function
    try {
      const result = await fn();
      this._onSuccess();
      this.metrics.successfulCalls++;
      return result;
    } catch (error) {
      this._onFailure(error, context);
      this.metrics.failedCalls++;
      throw error;
    }
  }

  /**
   * Handle successful execution
   * @private
   */
  _onSuccess() {
    this.failureCount = 0;
    this.callCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this._transitionTo(CircuitState.CLOSED);
      }
    }

    // Clean old failure history
    this._cleanFailureHistory();
  }

  /**
   * Handle failed execution
   * @private
   */
  _onFailure(error, context) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.callCount++;

    // Record failure in history
    this.failureHistory.push({
      timestamp: Date.now(),
      error: error.message,
      context
    });

    // Clean old failure history
    this._cleanFailureHistory();

    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED &&
        this._getRecentFailures() >= this.config.failureThreshold) {
      this._transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.HALF_OPEN) {
      // If we're in half-open and get a failure, go back to open
      this._transitionTo(CircuitState.OPEN);
    }

    logger.warn('Circuit breaker failure recorded', {
      correlationId: this.correlationId,
      serviceName: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      recentFailures: this._getRecentFailures(),
      error: error.message,
      ...context
    });
  }

  /**
   * Check if we should attempt to reset the circuit
   * @private
   */
  _shouldAttemptReset() {
    if (!this.lastFailureTime) return false;

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  /**
   * Transition to a new state
   * @private
   */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    // Reset counters on state changes
    if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.failureHistory = [];
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    }

    // Record state change
    this.metrics.stateChanges.push({
      timestamp: Date.now(),
      from: oldState,
      to: newState
    });

    logger.info('Circuit breaker state changed', {
      correlationId: this.correlationId,
      serviceName: this.config.name,
      fromState: oldState,
      toState: newState,
      failureCount: this.failureCount,
      recoveryTimeout: this.config.recoveryTimeout
    });
  }

  /**
   * Get number of failures in the monitoring period
   * @private
   */
  _getRecentFailures() {
    const cutoffTime = Date.now() - this.config.monitoringPeriod;
    return this.failureHistory.filter(failure => failure.timestamp > cutoffTime).length;
  }

  /**
   * Clean old failure history
   * @private
   */
  _cleanFailureHistory() {
    const cutoffTime = Date.now() - this.config.monitoringPeriod;
    this.failureHistory = this.failureHistory.filter(
      failure => failure.timestamp > cutoffTime
    );
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      serviceName: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      recentFailures: this._getRecentFailures(),
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.state === CircuitState.OPEN ?
        (this.lastFailureTime || 0) + this.config.recoveryTimeout : null,
      metrics: { ...this.metrics },
      config: { ...this.config }
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this._transitionTo(CircuitState.CLOSED);
    logger.info('Circuit breaker manually reset', {
      correlationId: this.correlationId,
      serviceName: this.config.name
    });
  }

  /**
   * Force the circuit breaker open
   */
  forceOpen() {
    this._transitionTo(CircuitState.OPEN);
    logger.warn('Circuit breaker manually opened', {
      correlationId: this.correlationId,
      serviceName: this.config.name
    });
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(serviceName, config = {}) {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker({
        name: serviceName,
        ...config
      }));
    }
    return this.breakers.get(serviceName);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatuses() {
    const statuses = {};
    for (const [name, breaker] of this.breakers) {
      statuses[name] = breaker.getStatus();
    }
    return statuses;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Circuit breaker decorator for methods
 */
export const circuitBreak = (serviceName, config = {}) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const breaker = circuitBreakerRegistry.getBreaker(serviceName, config);
      const context = {
        method: `${target.constructor.name}.${propertyKey}`,
        argsCount: args.length
      };

      return breaker.execute(() => originalMethod.apply(this, args), context);
    };

    return descriptor;
  };
};

/**
 * Execute function with circuit breaker protection
 */
export const withCircuitBreaker = (serviceName, fn, config = {}, context = {}) => {
  const breaker = circuitBreakerRegistry.getBreaker(serviceName, config);
  return breaker.execute(fn, context);
};

export default {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitState,
  circuitBreakerRegistry,
  circuitBreak,
  withCircuitBreaker
};
