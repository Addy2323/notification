import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { smsManagementController } from '../controllers/smsManagementController';

const router = Router();

// Public Snippe Webhook
router.post('/webhook/snippe', (req, res) => smsManagementController.handleSnippeWebhook(req, res));

// Merchant Protected Endpoints
router.get('/overview', requireAuth, (req, res) => smsManagementController.getMerchantOverview(req, res));
router.post('/topup', requireAuth, (req, res) => smsManagementController.initiateTopup(req, res));
router.get('/status/:reference', requireAuth, (req, res) => smsManagementController.getTopupStatus(req, res));
router.post('/repush/:reference', requireAuth, (req, res) => smsManagementController.repushUssd(req, res));


// Admin Protected Endpoints
router.get('/admin/overview', requireAuth, requireRole(['ADMIN']), (req, res) =>
  smsManagementController.getAdminOverview(req, res)
);
router.post('/admin/sync', requireAuth, requireRole(['ADMIN']), (req, res) =>
  smsManagementController.syncProviderData(req, res)
);
router.post('/admin/extend', requireAuth, requireRole(['ADMIN']), (req, res) =>
  smsManagementController.extendCredits(req, res)
);
router.post('/admin/notify', requireAuth, requireRole(['ADMIN']), (req, res) =>
  smsManagementController.notifyMerchant(req, res)
);
router.put('/admin/settings', requireAuth, requireRole(['ADMIN']), (req, res) =>
  smsManagementController.updateSettings(req, res)
);
router.post('/admin/verify-payment', requireAuth, requireRole(['ADMIN']), (req, res) =>
  smsManagementController.verifyPayment(req, res)
);

export default router;
