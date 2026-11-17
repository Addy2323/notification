import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as controller from '../controllers/verificationController';

const router = Router();
const merchantAccess = [requireAuth, requireRole(['MERCHANT', 'ADMIN'])];
const adminAccess = [requireAuth, requireRole(['ADMIN'])];

// Public Snippe Webhook & Public Active Plans
router.post('/webhook/snippe', controller.handleSnippeVerificationWebhook);
router.get('/plans', controller.listPublicPlans);

// Merchant Verification Endpoints
router.get('/my/status', ...merchantAccess, controller.getMyVerificationStatus);
router.post('/my/apply', ...merchantAccess, controller.initiateMyVerificationPayment);
router.get('/my/applications/:reference/status', ...merchantAccess, controller.checkMyPaymentStatus);
router.post('/my/applications/:reference/repush', ...merchantAccess, controller.repushMyPayment);

// Admin Verified Merchant Management Endpoints
router.get('/admin/overview', ...adminAccess, controller.getAdminOverview);
router.post('/admin/plans', ...adminAccess, controller.createAdminPlan);
router.patch('/admin/plans/:id', ...adminAccess, controller.updateAdminPlan);
router.post('/admin/applications/:id/approve', ...adminAccess, controller.approveApplication);
router.post('/admin/applications/:id/reject', ...adminAccess, controller.rejectApplication);
router.post('/admin/merchants/:merchantId/grant', ...adminAccess, controller.grantManualVerification);
router.post('/admin/merchants/:merchantId/status', ...adminAccess, controller.updateMerchantVerification);

export default router;

