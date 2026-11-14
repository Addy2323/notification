import { Router } from 'express';
import * as controller from '../controllers/confirmationReceiptController';
import { requireAuth, requireRole } from '../middleware/auth';
import { tokenApiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public customer confirmation receipt access (rate-limited, unauthenticated, token-validated)
router.get('/public/:token', tokenApiRateLimiter, controller.getPublicReceipt);
router.get('/public/:token/pdf', tokenApiRateLimiter, controller.downloadPublicReceiptPdf);

// SMS delivery webhook endpoint
router.post('/webhook/sms-status', controller.handleSmsWebhook);

// Admin overview & telemetry for confirmation receipts
router.get(
  '/admin/overview',
  requireAuth,
  requireRole(['ADMIN']),
  controller.getAdminReceiptsOverview
);

// Order-scoped receipt operations (also mounted on /api/orders/:id/receipt*)
router.get(
  '/orders/:id',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.getOrderReceipt
);
router.post(
  '/orders/:id/generate',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.generateOrderReceipt
);
router.get(
  '/orders/:id/pdf',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.downloadOrderReceiptPdf
);
router.post(
  '/orders/:id/resend-sms',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.resendOrderReceiptSms
);
router.post(
  '/orders/:id/revoke',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.revokeOrderReceipt
);

export default router;

