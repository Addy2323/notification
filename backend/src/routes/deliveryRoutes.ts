import { Router } from 'express';
import * as deliveryController from '../controllers/deliveryController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', deliveryController.create);
router.get('/', deliveryController.list);
router.get('/metrics', deliveryController.getMetrics);
router.patch('/branding', deliveryController.updateBranding);
router.get('/:id', deliveryController.detail);
router.post('/:id/cancel', deliveryController.cancel);
router.post('/:id/replace-driver', deliveryController.replaceDriver);

export default router;
