import { v4 as uuidv4 } from 'uuid';
import { runWithCorrelationId } from '../../../../shared/utils/correlation-context.js';

/**
 * Attach a correlation ID to every request and run the rest of the
 * middleware/handler chain inside an AsyncLocalStorage context so that
 * any code (repositories, services, logger calls) can read the ID without
 * it being passed as an explicit argument or mutated onto singletons.
 */
export const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();

  req.correlationId = correlationId;
  res.set('x-correlation-id', correlationId);
  res.locals.correlationId = correlationId;

  // Wrap the remainder of the request pipeline in the async-local context.
  runWithCorrelationId(correlationId, next);
};
