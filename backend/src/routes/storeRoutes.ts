import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import * as controller from '../controllers/storeController';
import { requireAuth, requireRole } from '../middleware/auth';
import { tokenApiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const storeUploadDir = path.join(__dirname, '../../public/uploads/store');
if (!fs.existsSync(storeUploadDir)) {
  fs.mkdirSync(storeUploadDir, { recursive: true });
}

const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(storeUploadDir)) {
        fs.mkdirSync(storeUploadDir, { recursive: true });
      }
      cb(null, storeUploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
      const safeExt = allowedExts.has(ext) ? ext : '.png';
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `store-${suffix}${safeExt}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExts.has(ext) || !allowedMimes.has(file.mimetype)) {
      cb(new Error('Only JPG, JPEG, PNG, and WebP images are permitted.'));
      return;
    }
    cb(null, true);
  },
});

function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  uploadMiddleware.single('image')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_VALIDATION_ERROR',
          message: err.message || 'Image upload rejected (max 5 MB JPG/PNG/WebP).',
        },
      });
    }
    return next();
  });
}

// ==========================================
// PUBLIC STOREFRONT & TRACKING REORDER ROUTES
// ==========================================
router.get('/public/sitemap-slugs', controller.getPublicSitemapSlugs);
router.get('/public/buy-again/:token', tokenApiRateLimiter, controller.getPublicBuyAgainPreview);
router.post('/public/buy-again/:token', tokenApiRateLimiter, controller.postPublicBuyAgainOrder);
router.get('/public/:slug', tokenApiRateLimiter, controller.getPublicStore);
router.get('/public/:slug/products/:productId', tokenApiRateLimiter, controller.getPublicProduct);
router.get('/public/:slug/qr', tokenApiRateLimiter, controller.getPublicQrCode);
router.post('/public/:slug/events', tokenApiRateLimiter, controller.postPublicEvent);
router.post('/public/:slug/order-request', tokenApiRateLimiter, controller.postPublicOrderOrEnquiry);

// ==========================================
// MERCHANT MY STORE DASHBOARD ROUTES
// ==========================================
const merchantAccess = [requireAuth, requireRole(['MERCHANT', 'STAFF', 'ADMIN'])] as const;

router.get('/my/dashboard', ...merchantAccess, controller.getMyStoreDashboard);
router.get('/my/slug-check', ...merchantAccess, controller.checkMySlug);
router.put('/my/store', ...merchantAccess, controller.saveMyStore);
router.post('/my/publish', ...merchantAccess, controller.publishMyStore);
router.get('/my/qr', ...merchantAccess, controller.getMyQrCode);
router.post('/my/upload-image', ...merchantAccess, handleImageUpload, controller.uploadStoreImage);

router.get('/my/products', ...merchantAccess, controller.listMyProducts);
router.post('/my/products', ...merchantAccess, controller.createMyProduct);
router.patch('/my/products/:id', ...merchantAccess, controller.updateMyProduct);

router.get('/my/categories', ...merchantAccess, controller.listMyCategories);
router.post('/my/categories', ...merchantAccess, controller.saveMyCategory);
router.delete('/my/categories/:id', ...merchantAccess, controller.removeMyCategory);

router.patch('/my/enquiries/:id/status', ...merchantAccess, controller.updateMyEnquiryStatus);

router.get('/my/customers', ...merchantAccess, controller.listMyCustomersConsent);
router.patch('/my/customers/:customerId/consent', ...merchantAccess, controller.updateMyCustomerConsent);
router.post('/my/sms/preview', ...merchantAccess, controller.previewMyStoreSms);
router.post('/my/sms/send', ...merchantAccess, controller.sendMyStoreSms);

// ==========================================
// ADMIN STORE GOVERNANCE ROUTES
// ==========================================
router.get('/admin/stores', requireAuth, requireRole(['ADMIN']), controller.listAdminStoresController);
router.patch(
  '/admin/stores/:id/status',
  requireAuth,
  requireRole(['ADMIN']),
  controller.updateAdminStoreStatusController
);

export default router;

