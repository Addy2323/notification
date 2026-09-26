import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login/register attempts per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const tokenApiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please wait a moment before trying again.',
    },
  },
});

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[GLOBAL ERROR HANDLER]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An internal server error occurred.';

  return sendError(res, 'INTERNAL_SERVER_ERROR', message, statusCode);
}
