import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { handleSmsDeliveryWebhook } from '../services/receiptConfirmationService';
import {
  getPublicReceiptByToken,
  getPublicReceiptPdfBuffer,
  getOrderReceiptPdfBuffer,
  triggerConfirmationReceipt,
  resendConfirmationReceiptSms,
  revokeConfirmationReceipt,
  formatReceiptSummary,
  getAdminConfirmationReceiptsOverview,
} from '../services/confirmationReceiptService';

function applyPublicNoCacheHeaders(res: Response) {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

export async function getPublicReceipt(req: Request, res: Response) {
  applyPublicNoCacheHeaders(res);
  try {
    const result = await getPublicReceiptByToken(req.params.token);

    if (result.status === 'NOT_FOUND') {
      return sendError(res, 'RECEIPT_NOT_FOUND', 'Receipt not found or invalid link.', 404);
    }
    if (result.status === 'REVOKED') {
      return res.status(410).json({
        success: false,
        error: {
          code: 'RECEIPT_REVOKED',
          message: 'This confirmation receipt link has been revoked.',
        },
        data: { status: 'REVOKED', receiptNumber: result.receiptNumber },
      });
    }
    if (result.status === 'EXPIRED') {
      return res.status(410).json({
        success: false,
        error: {
          code: 'RECEIPT_EXPIRED',
          message: 'This confirmation receipt link has expired.',
        },
        data: { status: 'EXPIRED', receiptNumber: result.receiptNumber },
      });
    }

    return sendSuccess(res, result.receipt);
  } catch (err: any) {
    return sendError(res, 'RECEIPT_FETCH_ERROR', err.message || 'Failed to load receipt', 500);
  }
}

export async function downloadPublicReceiptPdf(req: Request, res: Response) {
  applyPublicNoCacheHeaders(res);
  try {
    const result = await getPublicReceiptPdfBuffer(req.params.token);

    if (result.status === 'NOT_FOUND') {
      return sendError(res, 'RECEIPT_NOT_FOUND', 'Receipt not found or invalid link.', 404);
    }
    if (result.status === 'REVOKED') {
      return sendError(res, 'RECEIPT_REVOKED', 'This confirmation receipt link has been revoked.', 410);
    }
    if (result.status === 'EXPIRED') {
      return sendError(res, 'RECEIPT_EXPIRED', 'This confirmation receipt link has expired.', 410);
    }

    const asDownload = req.query.download === '1' || req.query.download === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${asDownload ? 'attachment' : 'inline'}; filename="${result.filename || 'Confirmation-Receipt.pdf'}"`
    );
    res.setHeader('Content-Length', String(result.buffer!.length));
    return res.send(result.buffer);
  } catch (err: any) {
    return sendError(res, 'RECEIPT_PDF_ERROR', err.message || 'Failed to generate receipt PDF', 500);
  }
}

export async function handleSmsWebhook(req: Request, res: Response) {
  try {
    const messageId = String(req.body?.messageId || req.body?.message_id || req.body?.id || '').trim();
    const rawStatus = String(req.body?.status || '').toUpperCase().trim();
    const failureReason = req.body?.failureReason || req.body?.failure_reason || req.body?.error;

    if (!messageId || (rawStatus !== 'DELIVERED' && rawStatus !== 'FAILED')) {
      return sendError(res, 'VALIDATION_ERROR', 'Valid messageId and status (DELIVERED or FAILED) are required', 400);
    }

    const result = await handleSmsDeliveryWebhook({
      messageId,
      status: rawStatus as 'DELIVERED' | 'FAILED',
      deliveredAt: req.body?.deliveredAt ? new Date(req.body.deliveredAt) : new Date(),
      failureReason: failureReason ? String(failureReason) : undefined,
    });

    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'WEBHOOK_ERROR', err.message || 'Failed to process SMS webhook', 500);
  }
}

export async function getOrderReceipt(req: Request, res: Response) {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const order = await prisma.order.findFirst({
      where: isAdmin ? { id: req.params.id } : { id: req.params.id, merchant_id: req.user!.merchant_id },
      include: { confirmation_receipt: true },
    });

    if (!order) {
      return sendError(res, 'NOT_FOUND', 'Order not found', 404);
    }

    return sendSuccess(res, {
      orderStatus: order.status,
      receipt: (order as any).confirmation_receipt
        ? formatReceiptSummary((order as any).confirmation_receipt)
        : null,
    });
  } catch (err: any) {
    return sendError(res, 'ORDER_RECEIPT_ERROR', err.message, 500);
  }
}

export async function generateOrderReceipt(req: Request, res: Response) {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const order = await prisma.order.findFirst({
      where: isAdmin ? { id: req.params.id } : { id: req.params.id, merchant_id: req.user!.merchant_id },
    });

    if (!order) {
      return sendError(res, 'NOT_FOUND', 'Order not found', 404);
    }
    if (order.status !== 'COMPLETED' && order.status !== 'DELIVERED') {
      return sendError(
        res,
        'ORDER_NOT_COMPLETED',
        'Confirmation receipts can only be generated for completed orders.',
        400
      );
    }

    const receipt = await triggerConfirmationReceipt(order.id, {
      triggeredBy: req.user!.name,
      syncSms: true,
    });

    return sendSuccess(res, {
      receipt: receipt ? formatReceiptSummary(receipt) : null,
    });
  } catch (err: any) {
    return sendError(res, 'GENERATE_RECEIPT_ERROR', err.message, 500);
  }
}

export async function downloadOrderReceiptPdf(req: Request, res: Response) {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const result = await getOrderReceiptPdfBuffer({
      orderId: req.params.id,
      merchantId: req.user!.merchant_id,
      isAdmin,
    });

    const inline = req.query.inline === '1' || req.query.inline === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${result.filename}"`
    );
    res.setHeader('Content-Length', String(result.buffer.length));
    return res.send(result.buffer);
  } catch (err: any) {
    const status = err.message === 'Order not found' ? 404 : err.message.includes('only available') ? 400 : 500;
    return sendError(res, 'RECEIPT_PDF_ERROR', err.message, status);
  }
}

export async function resendOrderReceiptSms(req: Request, res: Response) {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const result = await resendConfirmationReceiptSms({
      orderId: req.params.id,
      merchantId: req.user!.merchant_id,
      actorId: req.user!.id,
      actorName: req.user!.name,
      isAdmin,
    });

    return sendSuccess(res, {
      receipt: formatReceiptSummary(result.receipt),
      message: result.message,
      smsSent: result.receipt?.sms_status === 'SMS_SENT' || result.receipt?.sms_status === 'SMS_DELIVERED',
    });
  } catch (err: any) {
    const status = err.message === 'Order not found' ? 404 : 400;
    return sendError(res, 'RESEND_RECEIPT_SMS_ERROR', err.message, status);
  }
}

export async function revokeOrderReceipt(req: Request, res: Response) {
  try {
    const parsed = z.object({ reason: z.string().trim().max(300).optional() }).safeParse(req.body || {});
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    }

    const isAdmin = req.user!.role === 'ADMIN';
    const updated = await revokeConfirmationReceipt({
      orderId: req.params.id,
      merchantId: req.user!.merchant_id,
      actorId: req.user!.id,
      actorName: req.user!.name,
      reason: parsed.data.reason,
      isAdmin,
    });

    return sendSuccess(res, {
      receipt: formatReceiptSummary(updated),
      message: 'Confirmation receipt link revoked successfully.',
    });
  } catch (err: any) {
    const status = err.message === 'Order not found' ? 404 : 400;
    return sendError(res, 'REVOKE_RECEIPT_ERROR', err.message, status);
  }
}

export async function getAdminReceiptsOverview(req: Request, res: Response) {
  try {
    const { search, status, smsStatus, merchantId, page, limit } = req.query;
    const data = await getAdminConfirmationReceiptsOverview({
      search: search as string | undefined,
      status: status as string | undefined,
      smsStatus: smsStatus as string | undefined,
      merchantId: merchantId as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });

    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'ADMIN_RECEIPTS_ERROR', err.message, 500);
  }
}

