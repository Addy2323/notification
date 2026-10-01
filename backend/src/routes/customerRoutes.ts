import { Router } from 'express';
import * as customerController from '../controllers/customerController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', customerController.searchCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', customerController.createCustomer);

export default router;
