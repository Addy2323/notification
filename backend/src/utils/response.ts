import { Response } from 'express';
import { resolveLanguage, reportTranslator, errorTranslationKey } from '../localization';

export function sendSuccess(res: Response, data: any, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendError(res: Response, code: string, message: string, statusCode: number = 400, details?: any) {
  const translationKey = errorTranslationKey(message, statusCode);
  const localizedMessage = reportTranslator(res.req ? resolveLanguage(res.req) : 'en')(translationKey);
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: localizedMessage,
      translationKey,
      ...(details ? { details } : {}),
    },
  });
}

