import logger from './logger';
import { CircularBuffer } from './buffer';

/**
 * Trace context for distributed tracing with performance metrics
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled?: boolean;
  startTime?: number;
  endTime?: number;
  duration?: number;
  operation?: string;
}

/**
 * Span with performance tracking
 */
interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  sampled: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Distributed tracing utility with enhanced performance tracking and memory management
 * Provides trace IDs and span management for request tracking
 */
class TracingUtils {
  private static instance: TracingUtils;
  private currentTrace: TraceContext | null = null;
  private spanStack: TraceContext[] = [];
  private activeSpans = new WeakMap<object, Span>();
  private spanHistory = new CircularBuffer<Span>(100); // Keep last 100 spans
  private spanMetrics = new Map<string, { count: number; totalDuration: number; avgDuration: number }>();

  static getInstance(): TracingUtils {
    if (!TracingUtils.instance) {
      TracingUtils.instance = new TracingUtils();
    }
    return TracingUtils.instance;
  }

  /**
   * Generate a new trace ID
   */
  generateTraceId(): string {
    return `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a new span ID
   */
  generateSpanId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Start a new trace with performance tracking
   */
  startTrace(operation: string, parentTrace?: TraceContext): TraceContext {
    const traceId = parentTrace?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const startTime = typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now();

    const trace: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentTrace?.spanId,
      sampled: this.shouldSample(),
      startTime,
      operation,
    };

    this.currentTrace = trace;
    this.spanStack.push(trace);

    // Create span record
    const span: Span = {
      traceId,
      spanId,
      parentSpanId: parentTrace?.spanId,
      operation,
      startTime,
      sampled: trace.sampled ?? false,
    };
    this.activeSpans.set(trace as object, span);

    if (trace.sampled) {
      logger.tracing(`Started trace: ${operation}`, {
      traceId,
      spanId,
      parentSpanId: parentTrace?.spanId,
      operation,
      sampled: trace.sampled,
    });
    }

    return trace;
  }

  /**
   * Create a child span with performance tracking
   */
  createChildSpan(operation: string, parentTrace?: TraceContext): TraceContext {
    const currentTrace = parentTrace || this.currentTrace;
    if (!currentTrace) {
      return this.startTrace(operation);
    }

    const startTime = typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now();
    const spanId = this.generateSpanId();

    const childSpan: TraceContext = {
      traceId: currentTrace.traceId,
      spanId,
      parentSpanId: currentTrace.spanId,
      sampled: currentTrace.sampled,
      startTime,
      operation,
    };

    this.spanStack.push(childSpan);

    // Create span record
    const span: Span = {
      traceId: childSpan.traceId,
      spanId,
      parentSpanId: childSpan.parentSpanId,
      operation,
      startTime,
      sampled: childSpan.sampled ?? false,
    };
    this.activeSpans.set(childSpan as object, span);

    if (childSpan.sampled) {
      logger.tracing(`Created child span: ${operation}`, {
        traceId: childSpan.traceId,
      spanId: childSpan.spanId,
      parentSpanId: childSpan.parentSpanId,
      operation,
      sampled: childSpan.sampled,
    });
    }

    return childSpan;
  }

  /**
   * End a span and record performance metrics
   */
  endSpan(trace: TraceContext, metadata?: Record<string, unknown>): void {
    const span = this.activeSpans.get(trace as object);
    if (!span) return;

    const endTime = typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now();
    const duration = endTime - span.startTime;

    span.endTime = endTime;
    span.duration = duration;
    span.metadata = metadata;

    // Update trace context
    trace.endTime = endTime;
    trace.duration = duration;

    // Record metrics
    this.updateSpanMetrics(span.operation, duration);

    // Move to history
    this.spanHistory.push(span);

    // Remove from active spans
    this.activeSpans.delete(trace as object);

    // Remove from stack
    const stackIndex = this.spanStack.findIndex(s => s.spanId === trace.spanId);
    if (stackIndex !== -1) {
      this.spanStack.splice(stackIndex, 1);
    }

    // Update current trace if this was the current one
    if (this.currentTrace?.spanId === trace.spanId) {
      this.currentTrace = this.spanStack.length > 0 ? this.spanStack[this.spanStack.length - 1] : null;
    }

    if (trace.sampled) {
      logger.performance(`Span completed: ${span.operation}`, {
        traceId: span.traceId,
        spanId: span.spanId,
        duration,
        ...metadata,
      });
    }
  }

  /**
   * Update span performance metrics
   */
  private updateSpanMetrics(operation: string, duration: number): void {
    const existing = this.spanMetrics.get(operation);
    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.avgDuration = existing.totalDuration / existing.count;
    } else {
      this.spanMetrics.set(operation, {
        count: 1,
        totalDuration: duration,
        avgDuration: duration,
      });
    }

    // Limit metrics size
    if (this.spanMetrics.size > 50) {
      const firstKey = this.spanMetrics.keys().next().value;
      if (firstKey) {
        this.spanMetrics.delete(firstKey);
      }
    }
  }

  /**
   * Get span metrics for an operation
   */
  getSpanMetrics(operation?: string): Map<string, { count: number; totalDuration: number; avgDuration: number }> | { count: number; totalDuration: number; avgDuration: number } | undefined {
    if (operation) {
      return this.spanMetrics.get(operation);
    }
    return new Map(this.spanMetrics);
  }

  /**
   * Get span history
   */
  getSpanHistory(): Span[] {
    return this.spanHistory.getAll();
  }

  /**
   * Clear span history and metrics
   */
  clearSpanHistory(): void {
    this.spanHistory.clear();
    this.spanMetrics.clear();
  }

  /**
   * Get current trace context
   */
  getCurrentTrace(): TraceContext | null {
    return this.currentTrace;
  }

  /**
   * Set current trace context
   */
  setCurrentTrace(trace: TraceContext | null): void {
    this.currentTrace = trace;
  }

  /**
   * Extract trace context from headers
   */
  extractFromHeaders(headers: Record<string, string>): TraceContext | null {
    const traceId = headers['x-trace-id'] || headers['x-request-id'];
    const spanId = headers['x-span-id'];
    const parentSpanId = headers['x-parent-span-id'];
    const sampled = headers['x-sampled'] === 'true';

    if (!traceId) return null;

    return {
      traceId,
      spanId: spanId || this.generateSpanId(),
      parentSpanId,
      sampled,
    };
  }

  /**
   * Inject trace context into headers
   */
  injectIntoHeaders(trace: TraceContext, headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      'x-trace-id': trace.traceId,
      'x-span-id': trace.spanId,
      ...(trace.parentSpanId && { 'x-parent-span-id': trace.parentSpanId }),
      ...(trace.sampled !== undefined && { 'x-sampled': trace.sampled.toString() }),
    };
  }

  /**
   * Determine if request should be sampled
   */
  private shouldSample(): boolean {
    // Sample 10% of requests in production, 100% in development
    const sampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
    return Math.random() < sampleRate;
  }

  /**
   * Log with trace context
   */
  logWithTrace(
    level: 'debug' | 'info' | 'warn' | 'error' | 'trace',
    message: string,
    context?: Record<string, unknown>
  ): void {
    const trace = this.getCurrentTrace();
    const logContext = {
      ...context,
      ...(trace && {
        traceId: trace.traceId,
        spanId: trace.spanId,
        sampled: trace.sampled,
      }),
    };

    logger[level](message, logContext);
  }

  /**
   * Create traced function wrapper with automatic span management
   */
  traceFunction<T extends (...args: never[]) => unknown>(
    operation: string,
    fn: T,
    parentTrace?: TraceContext
  ): T {
    return ((...args: Parameters<T>) => {
      const trace = this.createChildSpan(operation, parentTrace);

      try {
        if (trace.sampled) {
          this.logWithTrace('trace', `Starting operation: ${operation}`, {
          operation,
          argsCount: args.length,
        });
        }

        const result = fn(...args);

        // Handle promises
        if (result && typeof result === 'object' && result !== null && 'then' in result && typeof result.then === 'function') {
          return result
            .then((resolvedResult: unknown) => {
              this.endSpan(trace, { success: true });
              if (trace.sampled) {
                this.logWithTrace('trace', `Operation completed: ${operation}`, {
                operation,
                success: true,
              });
              }
              return resolvedResult;
            })
            .catch((error: unknown) => {
              this.endSpan(trace, {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });
              this.logWithTrace('error', `Operation failed: ${operation}`, {
                operation,
                error: error instanceof Error ? error.message : String(error),
                success: false,
                category: 'tracing',
              });
              throw error;
            });
        }

        // Handle synchronous results
        this.endSpan(trace, { success: true });
        if (trace.sampled) {
          this.logWithTrace('trace', `Operation completed: ${operation}`, {
          operation,
          success: true,
        });
        }

        return result;
      } catch (error) {
        this.endSpan(trace, {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        this.logWithTrace('error', `Operation failed: ${operation}`, {
          operation,
          error: error instanceof Error ? error.message : String(error),
          success: false,
          category: 'tracing',
        });
        throw error;
      }
    }) as T;
  }

  /**
   * Create traced async function wrapper
   */
  traceAsyncFunction<T extends (...args: never[]) => Promise<unknown>>(
    operation: string,
    fn: T,
    parentTrace?: TraceContext
  ): T {
    return this.traceFunction(operation, fn, parentTrace) as T;
  }
}

// Create singleton instance
const tracingUtils = TracingUtils.getInstance();

// Export convenience functions
export const startTrace = (operation: string, parentTrace?: TraceContext) =>
  tracingUtils.startTrace(operation, parentTrace);

export const createChildSpan = (operation: string, parentTrace?: TraceContext) =>
  tracingUtils.createChildSpan(operation, parentTrace);

export const getCurrentTrace = () => tracingUtils.getCurrentTrace();

export const setCurrentTrace = (trace: TraceContext | null) =>
  tracingUtils.setCurrentTrace(trace);

export const extractFromHeaders = (headers: Record<string, string>) =>
  tracingUtils.extractFromHeaders(headers);

export const injectIntoHeaders = (trace: TraceContext, headers?: Record<string, string>) =>
  tracingUtils.injectIntoHeaders(trace, headers);

export const logWithTrace = (
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, unknown>
) => tracingUtils.logWithTrace(level, message, context);

export const traceFunction = <T extends (...args: never[]) => unknown>(
  operation: string,
  fn: T,
  parentTrace?: TraceContext
) => tracingUtils.traceFunction(operation, fn, parentTrace);

export const traceAsyncFunction = <T extends (...args: never[]) => Promise<unknown>>(
  operation: string,
  fn: T,
  parentTrace?: TraceContext
) => tracingUtils.traceAsyncFunction(operation, fn, parentTrace);

export const endSpan = (trace: TraceContext, metadata?: Record<string, unknown>) =>
  tracingUtils.endSpan(trace, metadata);

export const getSpanMetrics = (operation?: string) =>
  tracingUtils.getSpanMetrics(operation);

export const getSpanHistory = () => tracingUtils.getSpanHistory();

export const clearSpanHistory = () => tracingUtils.clearSpanHistory();

export default tracingUtils;
