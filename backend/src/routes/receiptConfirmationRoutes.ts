import { Router } from 'express';
import * as controller from '../controllers/receiptConfirmationController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. PUBLIC CUSTOMER CONFIRMATION ENDPOINTS
// ==========================================
router.get('/token/:token', controller.getPublicConfirmationInfo);
router.post('/submit', controller.submitPublicConfirmation);

// SMS Provider Webhook (callbacks for delivery receipts)
router.post('/webhook', controller.handleProviderWebhook);

// ==========================================
// 2. MERCHANT / VENDOR DASHBOARD ENDPOINTS
// ==========================================
router.get(
  '/merchant/list',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.listReceiptConfirmations
);
router.get(
  '/merchant/stats',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.getReceiptConfirmationKPIs
);
router.get(
  '/merchant/:id',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.getReceiptConfirmationDetail
);
router.post(
  '/merchant/:id/notes',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.addFollowupNote
);
router.patch(
  '/merchant/:id/case',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.updateFollowupCase
);
router.post(
  '/merchant/:id/resend',
  requireAuth,
  requireRole(['MERCHANT', 'STAFF', 'ADMIN']),
  controller.resendConfirmationSMS
);

// ==========================================
// 3. ADMIN DASHBOARD ENDPOINTS
// ==========================================
router.get(
  '/admin/list',
  requireAuth,
  requireRole(['ADMIN']),
  controller.listReceiptConfirmations
);
router.get(
  '/admin/stats',
  requireAuth,
  requireRole(['ADMIN']),
  controller.getReceiptConfirmationKPIs
);
router.get(
  '/admin/settings',
  requireAuth,
  requireRole(['ADMIN']),
  controller.getConfirmationSettings
);
router.put(
  '/admin/settings',
  requireAuth,
  requireRole(['ADMIN']),
  controller.updateConfirmationSettings
);
router.get(
  '/admin/:id',
  requireAuth,
  requireRole(['ADMIN']),
  controller.getReceiptConfirmationDetail
);
router.post(
  '/admin/:id/notes',
  requireAuth,
  requireRole(['ADMIN']),
  controller.addFollowupNote
);
router.patch(
  '/admin/:id/case',
  requireAuth,
  requireRole(['ADMIN']),
  controller.updateFollowupCase
);
router.post(
  '/admin/:id/resend',
  requireAuth,
  requireRole(['ADMIN']),
  controller.resendConfirmationSMS
);

export default router;
