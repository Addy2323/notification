import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as controller from '../controllers/merchantNotificationController';

const router = Router();
const merchantAccess = [requireAuth, requireRole(['MERCHANT', 'ADMIN'])];

router.get('/', ...merchantAccess, controller.listNotifications);
router.patch('/:id/read', ...merchantAccess, controller.markRead);
router.post('/read-all', ...merchantAccess, controller.markAllRead);
router.post('/:id/retry-sms', ...merchantAccess, controller.retrySms);

export default router;

