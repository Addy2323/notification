import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { snippePaymentService } from '../services/snippePaymentService';
import * as verificationService from '../services/verificationService';

export async function listPublicPlans(req: Request, res: Response) {
  try {
    const plans = await verificationService.listPublicVerificationPlans();
    return sendSuccess(res, { plans });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getMyVerificationStatus(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const data = await verificationService.getMerchantVerificationStatus(merchantId);
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function initiateMyVerificationPayment(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.merchant_id) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const { planId, phone } = req.body || {};
    if (!planId) return sendError(res, 'VALIDATION_ERROR', 'Plan selection is required', 400);

    const application = await verificationService.initiateVerificationPayment(
      user.merchant_id,
      user.id,
      planId,
      phone
    );
    return sendSuccess(res, { application }, 201);
  } catch (err: any) {
    return sendError(res, 'PAYMENT_INIT_ERROR', err.message || 'Unable to initiate verification payment', 400);
  }
}

export async function checkMyPaymentStatus(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const application = await verificationService.checkVerificationPaymentStatus(merchantId, req.params.reference);
    return sendSuccess(res, { application });
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message, 404);
  }
}

export async function repushMyPayment(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const result = await verificationService.repushVerificationPayment(
      merchantId,
      req.params.reference,
      req.body?.phone
    );
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'REPUSH_ERROR', err.message, 400);
  }
}

export async function handleSnippeVerificationWebhook(req: Request, res: Response) {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const verification = snippePaymentService.verifyWebhookSignature(rawBody, req.headers as any);
    if (!verification.valid && process.env.NODE_ENV === 'production') {
      return res.status(400).json({ error: verification.error || 'Invalid signature' });
    }

    const payload = req.body || {};
    if (payload.type === 'payment.completed' || payload.event === 'payment.completed') {
      const data = payload.data || {};
      const metadata = data.metadata || {};
      const reference = metadata.reference || metadata.order_id || data.reference;
      if (reference) {
        await verificationService.confirmVerificationPaymentIdempotent(
          reference,
          data.reference || data.external_reference
        );
      }
    }
    return res.status(200).send('OK');
  } catch (err: any) {
    console.error('[VERIFICATION SNIPPE WEBHOOK ERROR]', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}

// Admin Endpoints
export async function getAdminOverview(req: Request, res: Response) {
  try {
    const data = await verificationService.getAdminVerificationOverview(req.query.q as string | undefined);
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function createAdminPlan(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const plan = await verificationService.createOrUpdateVerificationPlan(adminId, null, req.body || {});
    return sendSuccess(res, { plan }, 201);
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function updateAdminPlan(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const plan = await verificationService.createOrUpdateVerificationPlan(adminId, req.params.id, req.body || {});
    return sendSuccess(res, { plan });
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function approveApplication(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const application = await verificationService.approveVerificationApplication(
      adminId,
      req.params.id,
      req.body?.notes
    );
    return sendSuccess(res, { application });
  } catch (err: any) {
    return sendError(res, 'APPROVAL_ERROR', err.message, 400);
  }
}

export async function rejectApplication(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const application = await verificationService.rejectVerificationApplication(
      adminId,
      req.params.id,
      req.body?.notes || 'Application rejected'
    );
    return sendSuccess(res, { application });
  } catch (err: any) {
    return sendError(res, 'REJECTION_ERROR', err.message, 400);
  }
}

export async function grantManualVerification(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const { durationDays, notes } = req.body || {};
    const application = await verificationService.grantManualVerification(
      adminId,
      req.params.merchantId,
      durationDays ? Number(durationDays) : 365,
      notes
    );
    return sendSuccess(res, { application });
  } catch (err: any) {
    return sendError(res, 'GRANT_ERROR', err.message, 400);
  }
}

export async function updateMerchantVerification(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const { action, extraDays, reason } = req.body || {};
    if (!['EXTEND', 'SUSPEND', 'REVOKE'].includes(action)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid action (EXTEND, SUSPEND, or REVOKE)', 400);
    }
    const result = await verificationService.updateMerchantVerificationState(
      adminId,
      req.params.merchantId,
      action,
      { extraDays: extraDays ? Number(extraDays) : undefined, reason }
    );
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'UPDATE_ERROR', err.message, 400);
  }
}

