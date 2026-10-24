import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError } from '../utils/response';
import * as confirmationService from '../services/receiptConfirmationService';

/**
 * Public: Get order info for receipt confirmation page by token
 */
export async function getPublicConfirmationInfo(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) {
      return sendError(res, 'BAD_REQUEST', 'Confirmation token is required', 400);
    }

    const data = await confirmationService.getPublicConfirmationInfo(token);
    if (!data) {
      return sendError(
        res,
        'NOT_FOUND',
        'Invalid or expired confirmation link. Please check your SMS or contact support.',
        404
      );
    }

    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Public: Submit customer confirmation (YES / NO)
 */
export async function submitPublicConfirmation(req: Request, res: Response) {
  try {
    const { token, response } = req.body;

    if (!token) {
      return sendError(res, 'BAD_REQUEST', 'Confirmation token is required', 400);
    }

    if (!response || !['YES', 'NO', 'RECEIVED', 'NOT_RECEIVED'].includes(response)) {
      return sendError(
        res,
        'INVALID_RESPONSE',
        'Response must be either YES (received) or NO (not received)',
        400
      );
    }

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';
    const userAgent = req.headers['user-agent'] || '';

    const result = await confirmationService.submitCustomerConfirmation({
      token,
      response,
      ipAddress,
      userAgent,
    });

    return sendSuccess(res, result);
  } catch (err: any) {
    if (err.code === 'ALREADY_SUBMITTED') {
      return sendError(
        res,
        'ALREADY_SUBMITTED',
        'You have already recorded your response for this order.',
        400,
        {
          existing_response: err.existingResponse,
          responded_at: err.respondedAt,
        }
      );
    }
    if (err.message === 'INVALID_TOKEN') {
      return sendError(res, 'INVALID_TOKEN', 'This confirmation link is invalid or expired.', 404);
    }
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * List receipt confirmations for Admin or Merchant
 */
export async function listReceiptConfirmations(req: Request, res: Response) {
  try {
    const isMerchant = req.user?.role !== 'ADMIN';
    const merchantId = isMerchant ? req.user?.merchant_id : (req.query.merchant_id as string) || null;

    const {
      search,
      customer_response,
      followup_status,
      sms_status,
      start_date,
      end_date,
      page,
      limit,
    } = req.query;

    const data = await confirmationService.listReceiptConfirmations({
      merchantId,
      search: search as string,
      customerResponse: customer_response as string,
      followupStatus: followup_status as string,
      smsStatus: sms_status as string,
      startDate: start_date as string,
      endDate: end_date as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 25,
    });

    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Get Receipt Confirmation KPIs for Admin or Merchant
 */
export async function getReceiptConfirmationKPIs(req: Request, res: Response) {
  try {
    const isMerchant = req.user?.role !== 'ADMIN';
    const merchantId = isMerchant ? req.user?.merchant_id : (req.query.merchant_id as string) || null;

    const kpis = await confirmationService.getReceiptConfirmationKPIs(merchantId);
    return sendSuccess(res, kpis);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Get detail of a single confirmation record
 */
export async function getReceiptConfirmationDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const isMerchant = req.user?.role !== 'ADMIN';
    const merchantId = isMerchant ? req.user?.merchant_id : null;

    const where: any = { id };
    if (merchantId) where.merchant_id = merchantId;

    const confirmation = await (prisma as any).orderReceiptConfirmation.findFirst({
      where,
      include: {
        order: {
          include: {
            items: true,
            driver: true,
            events: { orderBy: { timestamp: 'asc' } },
            notifications: {
              where: {
                event_type: {
                  in: [
                    'RECEIPT_CONFIRMATION_REQUEST',
                    'RECEIPT_CONFIRMATION_RESENT',
                    'RECEIPT_CONFIRMATION_THANK_YOU',
                    'RECEIPT_CONFIRMATION_INVESTIGATION',
                    'STAFF_FOLLOWUP_SMS',
                    'ORDER_DELIVERED',
                  ],
                },
              },
              orderBy: { created_at: 'desc' },
            },
          },
        },
        merchant: true,
      },
    });

    if (!confirmation) {
      return sendError(res, 'NOT_FOUND', 'Receipt confirmation record not found', 404);
    }

    return sendSuccess(res, confirmation);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Add an investigation note to a follow-up case
 */
export async function addFollowupNote(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return sendError(res, 'BAD_REQUEST', 'Note content cannot be empty', 400);
    }

    const isMerchant = req.user?.role !== 'ADMIN';
    const merchantId = isMerchant ? req.user?.merchant_id : null;
    const author = req.user?.name || (isMerchant ? 'Merchant Staff' : 'Administrator');
    const role = req.user?.role || 'STAFF';

    const updated = await confirmationService.addFollowupNote({
      confirmationId: id,
      author,
      role,
      text: note,
      merchantId,
    });

    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Update follow-up case status, assignment, resolution notes, and optional follow-up message
 */
export async function updateFollowupCase(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, assigned_staff, resolution_notes, customer_message } = req.body;

    const isMerchant = req.user?.role !== 'ADMIN';
    const merchantId = isMerchant ? req.user?.merchant_id : null;
    const authorName = req.user?.name || (isMerchant ? 'Merchant Staff' : 'Administrator');
    const authorRole = req.user?.role || 'STAFF';

    const updated = await confirmationService.updateFollowupCase({
      confirmationId: id,
      status,
      assigned_staff,
      resolution_notes,
      customer_message,
      authorName,
      authorRole,
      merchantId,
    });

    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Resend eligible confirmation SMS
 */
export async function resendConfirmationSMS(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const isMerchant = req.user?.role !== 'ADMIN';
    const merchantId = isMerchant ? req.user?.merchant_id : null;

    const where: any = { id };
    if (merchantId) where.merchant_id = merchantId;

    const confirmation = await (prisma as any).orderReceiptConfirmation.findFirst({
      where,
    });

    if (!confirmation) {
      return sendError(res, 'NOT_FOUND', 'Receipt confirmation record not found', 404);
    }

    if (confirmation.customer_response) {
      return sendError(
        res,
        'CANNOT_RESEND',
        'Cannot resend SMS: The customer has already recorded a response.',
        400
      );
    }

    const updated = await confirmationService.triggerOrderReceiptConfirmation(
      confirmation.order_id,
      {
        isResend: true,
        triggeredBy: req.user?.name || 'Staff',
      }
    );

    return sendSuccess(res, {
      message: 'Confirmation SMS has been resent successfully.',
      confirmation: updated,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Admin: Get bulk SMS & confirmation settings
 */
export async function getConfirmationSettings(req: Request, res: Response) {
  try {
    const settings = await confirmationService.getReceiptConfirmationSettings();
    return sendSuccess(res, settings);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Admin: Update bulk SMS & confirmation settings
 */
export async function updateConfirmationSettings(req: Request, res: Response) {
  try {
    const updated = await confirmationService.updateReceiptConfirmationSettings(req.body);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * SMS Provider delivery webhook
 */
export async function handleProviderWebhook(req: Request, res: Response) {
  try {
    const { message_id, status, error } = req.body;
    if (!message_id) {
      return sendError(res, 'BAD_REQUEST', 'message_id is required', 400);
    }

    const normStatus = (status || '').toUpperCase() === 'DELIVERED' ? 'DELIVERED' : 'FAILED';
    await confirmationService.handleSmsDeliveryWebhook({
      messageId: message_id,
      status: normStatus,
      deliveredAt: normStatus === 'DELIVERED' ? new Date() : undefined,
      failureReason: error,
    });

    return sendSuccess(res, { received: true });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}
