import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { tokenApiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(tokenApiRateLimiter);

router.get('/:token', driverController.getDriverDelivery);
router.post('/:token/accept', driverController.acceptDelivery);
router.post('/:token/start', driverController.startDelivery);
router.post('/:token/nearby', driverController.markNearby);
router.post('/:token/delivered', driverController.confirmDelivered);
router.post('/:token/failed', driverController.markFailed);

export default router;
