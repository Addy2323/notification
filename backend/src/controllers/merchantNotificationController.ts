import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import * as merchantNotificationService from '../services/merchantNotificationService';

export async function listNotifications(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);

    const data = await merchantNotificationService.listMerchantNotifications(merchantId, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      unreadOnly: req.query.unreadOnly === 'true',
    });
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function markRead(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);

    const notification = await merchantNotificationService.markMerchantNotificationRead(
      merchantId,
      req.params.id
    );
    return sendSuccess(res, { notification });
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message, 404);
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);

    const result = await merchantNotificationService.markAllMerchantNotificationsRead(merchantId);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function retrySms(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);

    const result = await merchantNotificationService.retryFailedMerchantNotificationSms(
      merchantId,
      req.params.id
    );
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'RETRY_ERROR', err.message, 400);
  }
}

