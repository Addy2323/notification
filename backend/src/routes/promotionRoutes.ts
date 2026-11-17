import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as controller from '../controllers/promotionController';

const router = Router();
const merchantAccess = [requireAuth, requireRole(['MERCHANT', 'ADMIN'])];
const adminAccess = [requireAuth, requireRole(['ADMIN'])];

// Merchant Promotion & Bulk SMS Endpoints
router.get('/overview', ...merchantAccess, controller.getOverview);
router.get('/templates', ...merchantAccess, controller.listTemplates);
router.post('/templates', ...merchantAccess, controller.createTemplate);
router.delete('/templates/:id', ...merchantAccess, controller.deleteTemplate);
router.get('/customers', ...merchantAccess, controller.listTargetCustomers);
router.post('/campaigns/preview', ...merchantAccess, controller.previewCampaign);
router.post('/campaigns', ...merchantAccess, controller.createCampaign);
router.get('/campaigns/:id', ...merchantAccess, controller.getCampaignDetails);
router.post('/campaigns/:id/duplicate', ...merchantAccess, controller.duplicateCampaign);
router.post('/campaigns/:id/retry-failed', ...merchantAccess, controller.retryCampaign);

// Admin Promotion Management Endpoints
router.get('/admin/overview', ...adminAccess, controller.getAdminOverview);

export default router;

