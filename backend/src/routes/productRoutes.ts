import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', ProductController.list);
router.post('/', ProductController.create);
router.get('/top', ProductController.getTopProducts);
router.get('/:id', ProductController.getById);

export default router;
