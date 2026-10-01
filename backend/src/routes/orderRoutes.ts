import { Router } from 'express';
import * as orderController from '../controllers/orderController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', orderController.createOrder);
router.get('/', orderController.listOrders);
router.get('/metrics', orderController.getOrderMetrics);
router.get('/:id', orderController.getOrderDetail);
router.patch('/:id/status', orderController.updateOrderStatus);
router.post('/:id/assign-driver', orderController.assignDriver);

export default router;
