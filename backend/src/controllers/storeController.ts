import { Request, Response } from 'express';
import { z } from 'zod';
import { sendSuccess, sendError } from '../utils/response';
import {
  DEFAULT_STORE_SMS_TEMPLATE,
  getPublicStoreUrl,
  checkSlugAvailability,
  getMerchantStoreDashboard,
  upsertMerchantStore,
  setStorePublicationStatus,
  listStoreCategories,
  upsertStoreCategory,
  deleteStoreCategory,
  listMerchantStoreProducts,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
  getPublicStoreBySlug,
  getPublicStoreProduct,
  recordPublicStoreEvent,
  submitPublicStoreOrderOrEnquiry,
  getBuyAgainOrderPreview,
  submitBuyAgainOrder,
  renderStoreSmsTemplate,
  updateCustomerMarketingConsent,
  listStoreCustomersWithConsent,
  sendStoreLinkSms,
  generateStoreQrSvg,
  listAdminStores,
  updateAdminStoreStatus,
  updateEnquiryStatus,
  listPublicSitemapSlugs,
} from '../services/storeService';

function getUserMerchantId(req: Request): string {
  const merchantId = req.user?.merchant_id;
  if (!merchantId) {
    throw new Error('Merchant context missing');
  }
  return merchantId;
}

function getUserId(req: Request): string {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('User context missing');
  }
  return userId;
}

function applyNoStoreHeaders(res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

// ==========================================
// PUBLIC STOREFRONT & TRACK-TO-SALE HANDLERS
// ==========================================

export async function getPublicStore(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '');
    const category = req.query.category ? String(req.query.category) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const sort = req.query.sort ? String(req.query.sort) : undefined;
    const featuredOnly = req.query.featured === 'true' || req.query.featured === '1';

    const result = await getPublicStoreBySlug(slug, {
      category,
      search,
      sort,
      featuredOnly,
    });

    if (result.status === 'REDIRECT') {
      return res.status(302).json({
        success: true,
        data: {
          status: 'REDIRECT',
          redirectSlug: result.redirectSlug,
          redirectUrl: getPublicStoreUrl(result.redirectSlug),
        },
      });
    }

    if (result.status === 'SUSPENDED') {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(410).json({
        success: false,
        error: {
          code: 'STORE_SUSPENDED',
          message: 'This merchant storefront is temporarily unavailable.',
        },
        data: {
          status: 'SUSPENDED',
          storeName: result.storeName,
        },
      });
    }

    if (result.status === 'NOT_FOUND') {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return sendError(res, 'STORE_NOT_FOUND', 'Storefront not found or not published yet.', 404);
    }

    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, 'PUBLIC_STORE_ERROR', error.message || 'Unable to load storefront', 500);
  }
}

export async function getPublicProduct(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '');
    const productKey = String(req.params.productId || '');

    const result = await getPublicStoreProduct(slug, productKey);

    if (result.status === 'REDIRECT') {
      return res.status(302).json({
        success: true,
        data: {
          status: 'REDIRECT',
          redirectSlug: result.redirectSlug,
        },
      });
    }

    if (result.status === 'SUSPENDED') {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return sendError(res, 'STORE_SUSPENDED', 'This storefront is temporarily unavailable.', 410);
    }

    if (result.status === 'NOT_FOUND' || result.status === 'PRODUCT_NOT_FOUND') {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return sendError(res, 'PRODUCT_NOT_FOUND', 'Product not found.', 404);
    }

    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, 'PUBLIC_PRODUCT_ERROR', error.message || 'Unable to load product', 500);
  }
}

const publicEventSchema = z.object({
  eventType: z.enum([
    'STORE_VIEW',
    'PRODUCT_VIEW',
    'STORE_LINK_CLICK',
    'WHATSAPP_CLICK',
    'CALL_CLICK',
    'TRACKING_CARD_CLICK',
  ]),
  productId: z.string().optional().nullable(),
  visitorId: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export async function postPublicEvent(req: Request, res: Response) {
  applyNoStoreHeaders(res);
  try {
    const parsed = publicEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid analytics event payload', 400);
    }

    const result = await recordPublicStoreEvent(req.params.slug, {
      eventType: parsed.data.eventType,
      productId: parsed.data.productId || undefined,
      visitorId: parsed.data.visitorId || undefined,
      referrer: parsed.data.referrer || undefined,
      metadata: parsed.data.metadata || undefined,
    });

    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, 'EVENT_RECORD_ERROR', error.message || 'Failed to record event', 500);
  }
}

const publicOrderOrEnquirySchema = z.object({
  type: z.enum(['ORDER_REQUEST', 'ENQUIRY']),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().min(1).max(1000).optional(),
  selectedVariantId: z.string().optional().nullable(),
  customerName: z.string().trim().min(2, 'Customer name is required').max(120),
  customerPhone: z.string().trim().min(6, 'Valid phone number is required').max(30),
  deliveryAddress: z.string().trim().max(300).optional().nullable(),
  message: z.string().trim().max(1000).optional().nullable(),
});

export async function postPublicOrderOrEnquiry(req: Request, res: Response) {
  applyNoStoreHeaders(res);
  try {
    const parsed = publicOrderOrEnquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid submission', 400);
    }

    const result = await submitPublicStoreOrderOrEnquiry(req.params.slug, {
      type: parsed.data.type,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      selectedVariantId: parsed.data.selectedVariantId || undefined,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      deliveryAddress: parsed.data.deliveryAddress || undefined,
      message: parsed.data.message || undefined,
    });

    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const msg = error.message || 'Unable to process storefront request';
    const status = msg.includes('unavailable') || msg.includes('longer available') ? 404 : 400;
    return sendError(res, 'STOREFRONT_SUBMISSION_ERROR', msg, status);
  }
}

export async function getPublicQrCode(req: Request, res: Response) {
  try {
    const result = await getPublicStoreBySlug(req.params.slug);
    if (result.status !== 'VALID') {
      return sendError(res, 'STORE_NOT_FOUND', 'Storefront QR code unavailable', 404);
    }

    const url = getPublicStoreUrl(result.store.slug);
    const svg = await generateStoreQrSvg(url);

    if (req.query.format === 'json') {
      return sendSuccess(res, { url, svg });
    }

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    if (req.query.download === '1' || req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${result.store.slug}-qr.svg"`);
    }
    return res.send(svg);
  } catch (error: any) {
    return sendError(res, 'QR_ERROR', error.message || 'Failed to generate QR code', 500);
  }
}

export async function getPublicSitemapSlugs(_req: Request, res: Response) {
  try {
    const stores = await listPublicSitemapSlugs();
    return sendSuccess(res, { stores });
  } catch (error: any) {
    return sendError(res, 'SITEMAP_ERROR', error.message || 'Unable to load public stores', 500);
  }
}

export async function getPublicBuyAgainPreview(req: Request, res: Response) {
  applyNoStoreHeaders(res);
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return sendError(res, 'INVALID_TOKEN', 'Tracking token is required', 400);
    }

    const preview = await getBuyAgainOrderPreview(token);
    if (!preview) {
      return sendError(res, 'REORDER_UNAVAILABLE', 'Buy Again is not available for this order.', 404);
    }

    return sendSuccess(res, preview);
  } catch (error: any) {
    return sendError(res, 'BUY_AGAIN_PREVIEW_ERROR', error.message || 'Unable to load reorder details', 500);
  }
}

const buyAgainSubmitSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name is required').max(120),
  customerPhone: z.string().trim().min(6, 'Customer phone is required').max(30),
  deliveryAddress: z.string().trim().min(2, 'Delivery address is required').max(300),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(1000),
      })
    )
    .min(1, 'Select at least one available item'),
});

export async function postPublicBuyAgainOrder(req: Request, res: Response) {
  applyNoStoreHeaders(res);
  try {
    const parsed = buyAgainSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid reorder payload', 400);
    }

    const result = await submitBuyAgainOrder(req.params.token, parsed.data);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const msg = error.message || 'Failed to place repeat order';
    const status = msg.includes('not found') || msg.includes('unavailable') ? 404 : 400;
    return sendError(res, 'BUY_AGAIN_ERROR', msg, status);
  }
}

// ==========================================
// MERCHANT DASHBOARD STORE MANAGEMENT
// ==========================================

export async function getMyStoreDashboard(req: Request, res: Response) {
  try {
    const merchantId = getUserMerchantId(req);
    const dashboard = await getMerchantStoreDashboard(merchantId);
    return sendSuccess(res, dashboard);
  } catch (error: any) {
    return sendError(res, 'STORE_DASHBOARD_ERROR', error.message || 'Failed to load store dashboard', 500);
  }
}

export async function checkMySlug(req: Request, res: Response) {
  try {
    const merchantId = getUserMerchantId(req);
    const slug = String(req.query.slug || '');
    const result = await checkSlugAvailability(slug, merchantId);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, 'SLUG_CHECK_ERROR', error.message || 'Slug validation failed', 400);
  }
}

const upsertStoreSchema = z.object({
  storeName: z.string().trim().min(2, 'Store name is required').max(120),
  slug: z.string().trim().optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  primaryColor: z.string().trim().optional(),
  secondaryColor: z.string().trim().optional(),
  contactPhone: z.string().trim().max(30).optional().nullable(),
  whatsappNumber: z.string().trim().max(30).optional().nullable(),
  contactEmail: z.string().trim().max(150).optional().nullable(),
  location: z.string().trim().max(250).optional().nullable(),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
  promotionalBannerText: z.string().trim().max(300).optional().nullable(),
  showSoldOutBadges: z.boolean().optional(),
  showOnTrackingPage: z.boolean().optional(),
  includeLinkInTransactionalSms: z.boolean().optional(),
  storeSmsTemplate: z.string().trim().max(500).optional(),
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export async function saveMyStore(req: Request, res: Response) {
  try {
    const parsed = upsertStoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid store configuration', 400);
    }

    const store = await upsertMerchantStore(getUserMerchantId(req), getUserId(req), parsed.data);
    return sendSuccess(res, { store });
  } catch (error: any) {
    return sendError(res, 'STORE_SAVE_ERROR', error.message || 'Unable to save store settings', 400);
  }
}

const publicationSchema = z.object({
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED']),
});

export async function publishMyStore(req: Request, res: Response) {
  try {
    const parsed = publicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Publication status must be DRAFT or PUBLISHED', 400);
    }

    const updated = await setStorePublicationStatus(
      getUserMerchantId(req),
      getUserId(req),
      parsed.data.publicationStatus
    );
    return sendSuccess(res, { store: updated });
  } catch (error: any) {
    return sendError(res, 'STORE_PUBLISH_ERROR', error.message || 'Unable to update store publication status', 400);
  }
}

export async function getMyQrCode(req: Request, res: Response) {
  try {
    const dashboard = await getMerchantStoreDashboard(getUserMerchantId(req));
    if (!dashboard.store) {
      return sendError(res, 'STORE_NOT_CREATED', 'Create your store first to generate a QR code.', 404);
    }

    const svg = await generateStoreQrSvg(dashboard.store.publicUrl);
    if (req.query.download === 'svg' || req.query.format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${dashboard.store.slug}-qr.svg"`);
      return res.send(svg);
    }

    return sendSuccess(res, {
      url: dashboard.store.publicUrl,
      slug: dashboard.store.slug,
      svg,
    });
  } catch (error: any) {
    return sendError(res, 'QR_GENERATION_ERROR', error.message || 'Failed to generate store QR code', 500);
  }
}

export async function uploadStoreImage(req: Request, res: Response) {
  try {
    getUserMerchantId(req);
    if (!req.file) {
      return sendError(res, 'NO_FILE', 'Please select a valid JPG, PNG, or WebP image file (max 5 MB).', 400);
    }

    const url = `/uploads/store/${req.file.filename}`;
    return sendSuccess(res, { url, filename: req.file.filename }, 201);
  } catch (error: any) {
    return sendError(res, 'UPLOAD_ERROR', error.message || 'Image upload failed', 400);
  }
}

export async function listMyProducts(req: Request, res: Response) {
  try {
    const products = await listMerchantStoreProducts(getUserMerchantId(req), {
      search: req.query.search ? String(req.query.search) : undefined,
      publicationStatus: req.query.publicationStatus ? String(req.query.publicationStatus) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
    });
    return sendSuccess(res, { products });
  } catch (error: any) {
    return sendError(res, 'PRODUCT_LIST_ERROR', error.message || 'Failed to load products', 500);
  }
}

const variantSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  type: z.string().optional(),
  value: z.string().optional(),
  price: z.coerce.number().min(0).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).optional().nullable(),
  sku: z.string().optional().nullable(),
});

const productUpsertSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(180),
  sku: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  brand: z.string().trim().max(80).optional().nullable(),
  currency: z.string().trim().max(10).optional(),
  unitPrice: z.coerce.number().min(0, 'Selling price must be >= 0'),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  promotionalPrice: z.coerce.number().min(0).optional().nullable(),
  promotionStartAt: z.string().optional().nullable(),
  promotionEndAt: z.string().optional().nullable(),
  availableQuantity: z.coerce.number().int().min(0).optional(),
  trackInventory: z.boolean().optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  isFeatured: z.boolean().optional(),
  primaryImageUrl: z.string().trim().max(500).optional().nullable(),
  images: z.array(z.string().trim().max(500)).optional(),
  variants: z.array(variantSchema).optional(),
});

export async function createMyProduct(req: Request, res: Response) {
  try {
    const parsed = productUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid product payload', 400);
    }

    const product = await createStoreProduct(getUserMerchantId(req), getUserId(req), parsed.data);
    return sendSuccess(res, { product }, 201);
  } catch (error: any) {
    return sendError(res, 'PRODUCT_CREATE_ERROR', error.message || 'Failed to create product', 400);
  }
}

export async function updateMyProduct(req: Request, res: Response) {
  try {
    const parsed = productUpsertSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid product update', 400);
    }

    const product = await updateStoreProduct(
      getUserMerchantId(req),
      getUserId(req),
      String(req.params.id),
      parsed.data
    );
    return sendSuccess(res, { product });
  } catch (error: any) {
    const status = error.message?.includes('not found') ? 404 : 400;
    return sendError(res, 'PRODUCT_UPDATE_ERROR', error.message || 'Failed to update product', status);
  }
}

export async function deleteMyProduct(req: Request, res: Response) {
  try {
    const result = await deleteStoreProduct(
      getUserMerchantId(req),
      getUserId(req),
      String(req.params.id)
    );
    return sendSuccess(res, result);
  } catch (error: any) {
    const status = error.message?.includes('not found') ? 404 : 400;
    return sendError(res, 'PRODUCT_DELETE_ERROR', error.message || 'Failed to delete product', status);
  }
}

export async function listMyCategories(req: Request, res: Response) {
  try {
    const categories = await listStoreCategories(getUserMerchantId(req));
    return sendSuccess(res, { categories });
  } catch (error: any) {
    return sendError(res, 'CATEGORY_LIST_ERROR', error.message || 'Failed to load categories', 500);
  }
}

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Category name is required').max(80),
  description: z.string().trim().max(250).optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export async function saveMyCategory(req: Request, res: Response) {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid category data', 400);
    }

    const category = await upsertStoreCategory(getUserMerchantId(req), parsed.data);
    return sendSuccess(res, { category });
  } catch (error: any) {
    return sendError(res, 'CATEGORY_SAVE_ERROR', error.message || 'Failed to save category', 400);
  }
}

export async function removeMyCategory(req: Request, res: Response) {
  try {
    const result = await deleteStoreCategory(getUserMerchantId(req), String(req.params.id));
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, 'CATEGORY_DELETE_ERROR', error.message || 'Failed to delete category', 404);
  }
}

const enquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']),
});

export async function updateMyEnquiryStatus(req: Request, res: Response) {
  try {
    const parsed = enquiryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid enquiry status', 400);
    }

    const enquiry = await updateEnquiryStatus(
      getUserMerchantId(req),
      String(req.params.id),
      parsed.data.status
    );
    return sendSuccess(res, { enquiry });
  } catch (error: any) {
    return sendError(res, 'ENQUIRY_UPDATE_ERROR', error.message || 'Failed to update enquiry', 404);
  }
}

export async function listMyCustomersConsent(req: Request, res: Response) {
  try {
    const customers = await listStoreCustomersWithConsent(getUserMerchantId(req));
    return sendSuccess(res, { customers });
  } catch (error: any) {
    return sendError(res, 'CONSENT_LIST_ERROR', error.message || 'Failed to fetch customers', 500);
  }
}

const consentUpdateSchema = z.object({
  optIn: z.boolean(),
  source: z.string().trim().max(80).optional(),
});

export async function updateMyCustomerConsent(req: Request, res: Response) {
  try {
    const parsed = consentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', 'optIn boolean is required', 400);
    }

    const customer = await updateCustomerMarketingConsent(
      getUserMerchantId(req),
      String(req.params.customerId),
      parsed.data.optIn,
      parsed.data.source || 'MERCHANT_DASHBOARD'
    );
    return sendSuccess(res, { customer });
  } catch (error: any) {
    return sendError(res, 'CONSENT_UPDATE_ERROR', error.message || 'Failed to update marketing consent', 400);
  }
}

const sendSmsSchema = z.object({
  customerIds: z.array(z.string().min(1)).optional(),
  recipientPhone: z.string().trim().optional(),
  recipientName: z.string().trim().optional(),
  customTemplate: z.string().trim().max(500).optional(),
  explicitConsentConfirmed: z.boolean().optional(),
});

export async function sendMyStoreSms(req: Request, res: Response) {
  try {
    const parsed = sendSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid SMS dispatch request', 400);
    }

    const result = await sendStoreLinkSms(getUserMerchantId(req), getUserId(req), parsed.data);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, 'STORE_SMS_ERROR', error.message || 'Failed to send store link SMS', 400);
  }
}

export async function previewMyStoreSms(req: Request, res: Response) {
  try {
    const dashboard = await getMerchantStoreDashboard(getUserMerchantId(req));
    const storeUrl = dashboard.store?.publicUrl || getPublicStoreUrl('your-store');
    const businessName = dashboard.store?.storeName || dashboard.prefill.storeName || 'Your Business';
    const template = String(
      req.body?.template || dashboard.store?.storeSmsTemplate || DEFAULT_STORE_SMS_TEMPLATE
    );
    const storeName = dashboard.store?.storeName || businessName;
    const rendered = renderStoreSmsTemplate(template, {
      customerName: String(req.body?.customerName || 'Amina'),
      businessName,
      storeName,
      storeLink: storeUrl,
      customerPhone: String(req.body?.customerPhone || '+255700000000'),
    });
    return sendSuccess(res, rendered);
  } catch (error: any) {
    return sendError(res, 'SMS_PREVIEW_ERROR', error.message || 'Failed to preview SMS', 400);
  }
}

// ==========================================
// ADMIN STORE GOVERNANCE
// ==========================================

export async function listAdminStoresController(req: Request, res: Response) {
  try {
    const data = await listAdminStores({
      search: req.query.search ? String(req.query.search) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 25,
    });
    return sendSuccess(res, data);
  } catch (error: any) {
    return sendError(res, 'ADMIN_STORES_LIST_ERROR', error.message || 'Failed to load stores', 500);
  }
}

const adminStoreStatusSchema = z.object({
  action: z.enum(['SUSPEND', 'RESTORE']),
  reason: z.string().trim().max(300).optional(),
});

export async function updateAdminStoreStatusController(req: Request, res: Response) {
  try {
    const parsed = adminStoreStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid moderation action', 400);
    }

    const store = await updateAdminStoreStatus(
      getUserId(req),
      String(req.params.id),
      parsed.data.action,
      parsed.data.reason
    );
    return sendSuccess(res, { store });
  } catch (error: any) {
    return sendError(res, 'ADMIN_STORE_UPDATE_ERROR', error.message || 'Failed to moderate store', 400);
  }
}
