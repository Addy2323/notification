import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN']));

router.get('/metrics', adminController.getMetrics);
router.get('/merchants', adminController.listMerchants);
router.patch('/merchants/:id/status', adminController.toggleMerchantStatus);
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
