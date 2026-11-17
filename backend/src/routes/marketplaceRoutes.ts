import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as controller from '../controllers/marketplaceController';

const router = Router();
const merchantAccess = [requireAuth, requireRole(['MERCHANT', 'ADMIN'])];
const adminAccess = [requireAuth, requireRole(['ADMIN'])];

// Public Marketplace Endpoints
router.get('/categories', controller.listPublicCategories);
router.get('/merchants', controller.listPublicMerchants);
router.get('/merchants/:slug', controller.getPublicMerchantProfile);
router.post('/merchants/:slug/follow', requireAuth, controller.toggleFollowMerchant);

// Merchant Marketplace Profile & Category Management
router.get('/my/categories', ...merchantAccess, controller.getMyCategories);
router.put('/my/categories', ...merchantAccess, controller.updateMyCategories);
router.get('/my/posts', ...merchantAccess, controller.listMyPosts);
router.post('/my/posts', ...merchantAccess, controller.createMyPost);
router.delete('/my/posts/:id', ...merchantAccess, controller.deleteMyPost);

// Admin Dynamic Category Management
router.get('/admin/categories', ...adminAccess, controller.listAdminCategories);
router.post('/admin/categories', ...adminAccess, controller.createAdminCategory);
router.patch('/admin/categories/:id', ...adminAccess, controller.updateAdminCategory);
router.delete('/admin/categories/:id', ...adminAccess, controller.deleteAdminCategory);

export default router;

