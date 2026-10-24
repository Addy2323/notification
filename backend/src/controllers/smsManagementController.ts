import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { smsManagementService } from '../services/smsManagementService';
import { snippePaymentService } from '../services/snippePaymentService';
import { sendSuccess, sendError } from '../utils/response';

export class SmsManagementController {
  // ================= Merchant Endpoints =================

  /**
   * Merchant: Get SMS overview, balance health, transactions & ledger.
   */
  async getMerchantOverview(req: Request, res: Response) {
    try {
      if (!req.user?.merchant_id) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }
      const overview = await smsManagementService.getMerchantOverview(req.user.merchant_id);
      return sendSuccess(res, overview);
    } catch (err: any) {
      console.error('[SMS MERCHANT OVERVIEW ERROR]', err);
      return sendError(res, 'SERVER_ERROR', err.message || 'Failed to fetch SMS overview', 500);
    }
  }

  /**
   * Merchant: Initiate custom SMS top-up and create Snippe checkout session.
   */
  async initiateTopup(req: Request, res: Response) {
    try {
      if (!req.user?.merchant_id) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const { requestedUnits, customerPhone, customerEmail } = req.body;
      const units = parseInt(requestedUnits, 10);

      if (isNaN(units) || units <= 0) {
        return sendError(res, 'VALIDATION_ERROR', 'A valid integer quantity of SMS units is required', 400);
      }

      const topup = await smsManagementService.initiateTopup({
        merchantId: req.user.merchant_id,
        requestedUnits: units,
        customerName: req.user.name,
        customerPhone: customerPhone || req.user.phone,
        customerEmail: customerEmail || req.user.email || undefined,
      });

      return sendSuccess(res, topup, 201);
    } catch (err: any) {
      console.error('[SMS TOPUP ERROR]', err);
      return sendError(res, 'VALIDATION_ERROR', err.message || 'Failed to initiate top-up', 400);
    }
  }

  /**
   * Merchant/Admin: Check status of a top-up transaction.
   */
  async getTopupStatus(req: Request, res: Response) {
    try {
      const reference = req.params.reference;
      if (!reference) {
        return sendError(res, 'VALIDATION_ERROR', 'Transaction reference is required', 400);
      }

      const settings = await smsManagementService.getSettings();
      // Look up transaction
      const tx = await (prisma as any).smsTopupTransaction.findUnique({
        where: { reference },
        include: { merchant: { select: { id: true, business_name: true } } },
      });

      if (!tx) {
        return sendError(res, 'NOT_FOUND', 'Transaction not found', 404);
      }

      // Security check: Merchant can only inspect their own transaction
      if (req.user?.role !== 'ADMIN' && req.user?.merchant_id !== tx.merchant_id) {
        return sendError(res, 'FORBIDDEN', 'Access denied to this transaction', 403);
      }

      // If pending and has gateway session, query Snippe for latest status
      if (tx.payment_status === 'PENDING' && tx.gateway_session_id) {
        const sessionData = await snippePaymentService.getSessionStatus(tx.gateway_session_id);
        if (sessionData && (sessionData.status === 'completed' || sessionData.status === 'paid')) {
          await smsManagementService.allocateTopupCredits({
            reference: tx.reference,
            gatewayReference: sessionData.reference,
          });
          tx.payment_status = 'COMPLETED';
          tx.allocated = true;
        }
      }

      return sendSuccess(res, tx);
    } catch (err: any) {
      return sendError(res, 'SERVER_ERROR', err.message, 500);
    }
  }

  // ================= Admin Endpoints =================

  /**
   * Admin: Global SMS Management Dashboard.
   */
  async getAdminOverview(req: Request, res: Response) {
    try {
      const overview = await smsManagementService.getAdminOverview();
      return sendSuccess(res, overview);
    } catch (err: any) {
      console.error('[SMS ADMIN OVERVIEW ERROR]', err);
      return sendError(res, 'SERVER_ERROR', err.message || 'Failed to fetch admin SMS overview', 500);
    }
  }

  /**
   * Admin: Synchronize Provider Data.
   */
  async syncProviderData(req: Request, res: Response) {
    try {
      const result = await smsManagementService.syncProviderData(req.user?.id);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'SERVER_ERROR', err.message, 500);
    }
  }

  /**
   * Admin: Extend or reverse merchant SMS credits.
   */
  async extendCredits(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const { merchantId, units, adjustmentType, reason, paymentReference } = req.body;
      const parsedUnits = parseInt(units, 10);

      if (!merchantId) {
        return sendError(res, 'VALIDATION_ERROR', 'Merchant ID is required', 400);
      }
      if (isNaN(parsedUnits) || parsedUnits === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'Units must be a non-zero integer', 400);
      }
      if (!reason || reason.trim().length === 0) {
        return sendError(res, 'VALIDATION_ERROR', 'A mandatory reason is required for adjustments', 400);
      }

      const validTypes = [
        'VERIFIED_PAID_TOPUP',
        'MANUAL_PAYMENT_APPROVAL',
        'ADMIN_ADJUSTMENT_GRANT',
        'CORRECTION_REVERSAL',
      ];
      if (!validTypes.includes(adjustmentType)) {
        return sendError(res, 'VALIDATION_ERROR', `Adjustment type must be one of: ${validTypes.join(', ')}`, 400);
      }

      const result = await smsManagementService.extendMerchantCredits({
        adminId: req.user.id,
        merchantId,
        units: parsedUnits,
        adjustmentType,
        reason,
        paymentReference,
      });

      return sendSuccess(res, result, 201);
    } catch (err: any) {
      console.error('[SMS EXTEND CREDITS ERROR]', err);
      return sendError(res, 'VALIDATION_ERROR', err.message || 'Failed to extend credits', 400);
    }
  }

  /**
   * Admin: One-Click Merchant Notification after SMS extension.
   */
  async notifyMerchant(req: Request, res: Response) {
    try {
      const { merchantId, creditedUnits, availableBalance, language } = req.body;

      if (!merchantId || creditedUnits === undefined || availableBalance === undefined) {
        return sendError(res, 'VALIDATION_ERROR', 'Missing required notification parameters', 400);
      }

      const result = await smsManagementService.notifyMerchantAfterExtension(
        merchantId,
        Number(creditedUnits),
        Number(availableBalance),
        language === 'sw' ? 'sw' : 'en'
      );

      if (!result.success) {
        return sendError(res, 'SMS_DISPATCH_FAILED', result.error || 'Failed to send SMS notification', 502);
      }

      return sendSuccess(res, {
        success: true,
        messageId: result.messageId,
        message: 'Merchant notified successfully via SMS',
      });
    } catch (err: any) {
      return sendError(res, 'SERVER_ERROR', err.message, 500);
    }
  }

  /**
   * Admin: Update global SMS settings.
   */
  async updateSettings(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const updated = await smsManagementService.updateSettings(req.user.id, req.body);
      return sendSuccess(res, updated);
    } catch (err: any) {
      return sendError(res, 'VALIDATION_ERROR', err.message, 400);
    }
  }

  /**
   * Admin: Manually verify payment and allocate credits.
   */
  async verifyPayment(req: Request, res: Response) {
    try {
      const { reference, reason } = req.body;
      if (!reference) {
        return sendError(res, 'VALIDATION_ERROR', 'Transaction reference is required', 400);
      }

      const result = await smsManagementService.allocateTopupCredits({
        reference,
        isManual: true,
        adminId: req.user?.id,
      });

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'SERVER_ERROR', err.message, 500);
    }
  }

  // ================= Snippe Webhook =================

  /**
   * Snippe Webhook Handler: HMAC-SHA256 signature verified.
   */
  async handleSnippeWebhook(req: Request, res: Response) {
    try {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const verification = snippePaymentService.verifyWebhookSignature(rawBody, req.headers as any);

      if (!verification.valid && process.env.NODE_ENV === 'production') {
        console.warn('[SNIPPE WEBHOOK SIGNATURE FAILED]:', verification.error);
        return res.status(400).json({ error: verification.error || 'Invalid signature' });
      }

      const payload = req.body;
      console.log(`[SNIPPE WEBHOOK EVENT]: Type=${payload.type || payload.event}`);

      if (payload.type === 'payment.completed' || payload.event === 'payment.completed') {
        const data = payload.data || {};
        const metadata = data.metadata || {};
        const reference = metadata.reference || metadata.order_id || data.reference;

        if (reference) {
          console.log(`[SNIPPE WEBHOOK] Allocating credits for transaction: ${reference}`);
          await smsManagementService.allocateTopupCredits({
            reference,
            gatewayReference: data.reference || data.external_reference,
          });
        }
      }

      return res.status(200).send('OK');
    } catch (err: any) {
      console.error('[SNIPPE WEBHOOK ERROR]', err);
      return res.status(500).json({ error: 'Webhook processing error' });
    }
  }
}

export const smsManagementController = new SmsManagementController();
