import logger from './logger';

/**
 * Trace context for distributed tracing
 */
interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled?: boolean;
}

/**
 * Distributed tracing utility
 * Provides trace IDs and span management for request tracking
 */
class TracingUtils {
  private static instance: TracingUtils;
  private currentTrace: TraceContext | null = null;

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
   * Start a new trace
   */
  startTrace(operation: string, parentTrace?: TraceContext): TraceContext {
    const traceId = parentTrace?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();

    const trace: TraceContext = {
      traceId,
      spanId,
      parentSpanId: parentTrace?.spanId,
      sampled: this.shouldSample(),
    };

    this.currentTrace = trace;

    logger.debug(`Started trace: ${operation}`, {
      traceId,
      spanId,
      parentSpanId: parentTrace?.spanId,
      operation,
      sampled: trace.sampled,
    });

    return trace;
  }

  /**
   * Create a child span
   */
  createChildSpan(operation: string, parentTrace?: TraceContext): TraceContext {
    const currentTrace = parentTrace || this.currentTrace;
    if (!currentTrace) {
      return this.startTrace(operation);
    }

    const childSpan: TraceContext = {
      traceId: currentTrace.traceId,
      spanId: this.generateSpanId(),
      parentSpanId: currentTrace.spanId,
      sampled: currentTrace.sampled,
    };

    logger.debug(`Created child span: ${operation}`, {
      traceId: childSpan.traceId,
      spanId: childSpan.spanId,
      parentSpanId: childSpan.parentSpanId,
      operation,
      sampled: childSpan.sampled,
    });

    return childSpan;
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
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: Record<string, any>
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
   * Create traced function wrapper
   */
  traceFunction<T extends (...args: any[]) => any>(
    operation: string,
    fn: T,
    parentTrace?: TraceContext
  ): T {
    return ((...args: Parameters<T>) => {
      const trace = this.createChildSpan(operation, parentTrace);

      try {
        this.logWithTrace('debug', `Starting operation: ${operation}`, {
          operation,
          argsCount: args.length,
        });

        const result = fn(...args);

        // Handle promises
        if (result && typeof result.then === 'function') {
          return result
            .then((resolvedResult: any) => {
              this.logWithTrace('debug', `Operation completed: ${operation}`, {
                operation,
                success: true,
              });
              return resolvedResult;
            })
            .catch((error: any) => {
              this.logWithTrace('error', `Operation failed: ${operation}`, {
                operation,
                error: error instanceof Error ? error.message : String(error),
                success: false,
              });
              throw error;
            });
        }

        // Handle synchronous results
        this.logWithTrace('debug', `Operation completed: ${operation}`, {
          operation,
          success: true,
        });

        return result;
      } catch (error) {
        this.logWithTrace('error', `Operation failed: ${operation}`, {
          operation,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
        throw error;
      }
    }) as T;
  }

  /**
   * Create traced async function wrapper
   */
  traceAsyncFunction<T extends (...args: any[]) => Promise<any>>(
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
  context?: Record<string, any>
) => tracingUtils.logWithTrace(level, message, context);

export const traceFunction = <T extends (...args: any[]) => any>(
  operation: string,
  fn: T,
  parentTrace?: TraceContext
) => tracingUtils.traceFunction(operation, fn, parentTrace);

export const traceAsyncFunction = <T extends (...args: any[]) => Promise<any>>(
  operation: string,
  fn: T,
  parentTrace?: TraceContext
) => tracingUtils.traceAsyncFunction(operation, fn, parentTrace);

export default tracingUtils;
