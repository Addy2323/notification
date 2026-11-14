import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { MesejiSMSAdapter, normalizePhone } from '../notifications/adapter';
import { smsManagementService } from './smsManagementService';
import * as orderService from './orderService';

export const DEFAULT_STORE_SMS_TEMPLATE =
  'Hello [Customer Name], explore more products from [Business Name]. View our available products here: [Store Link]. Thank you for shopping with us!';

const RESERVED_SLUGS = new Set([
  'admin',
  'dashboard',
  'api',
  'login',
  'register',
  'store',
  'stores',
  'receipt',
  'receipts',
  'confirm',
  'track',
  'driver',
  'rate',
  'public',
  'uploads',
  'static',
  'assets',
  'pricing',
  'features',
  'about',
  'contact',
  'faq',
  'blog',
  'sw',
]);

export interface ProductVariant {
  id: string;
  name: string;
  type?: string;
  value?: string;
  price?: number | null;
  stockQuantity?: number | null;
  sku?: string | null;
}

export interface StoreSocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

export function getPublicStoreUrl(slug: string): string {
  const cleanOrigin = (config.frontendUrl || 'https://lumotrack.lumo.co.tz').replace(/\/+$/, '');
  return `${cleanOrigin}/store/${slug}`;
}

export function generateStoreSlug(input: string): string {
  const base = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52);

  if (!base || base.length < 3 || RESERVED_SLUGS.has(base)) {
    const suffix = crypto.randomBytes(2).toString('hex');
    return `${base && base.length >= 2 ? base : 'merchant'}-store-${suffix}`;
  }
  return base;
}

export function validateStoreSlugFormat(rawSlug: string): { valid: boolean; slug: string; error?: string } {
  const slug = String(rawSlug || '').trim().toLowerCase();
  if (slug.length < 3 || slug.length > 60) {
    return { valid: false, slug, error: 'Store slug must be between 3 and 60 characters.' };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/.test(slug) || slug.includes('--')) {
    return {
      valid: false,
      slug,
      error: 'Store slug may only contain lowercase letters, numbers, and single hyphens.',
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { valid: false, slug, error: 'This store address is reserved. Please choose another.' };
  }
  return { valid: true, slug };
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function isPromotionCurrentlyActive(product: any, now: Date = new Date()): boolean {
  if (product.promotional_price === null || product.promotional_price === undefined) return false;
  const promoPrice = Number(product.promotional_price);
  const unitPrice = Number(product.unit_price || 0);
  if (!Number.isFinite(promoPrice) || promoPrice < 0 || promoPrice >= unitPrice) return false;

  if (product.promotion_start_at && now < new Date(product.promotion_start_at)) return false;
  if (product.promotion_end_at && now > new Date(product.promotion_end_at)) return false;
  return true;
}

/**
 * Customer-facing public product serializer.
 * Strictly strips merchant-only fields (cost_price, internal IDs/notes, profit data).
 */
export function serializePublicProduct(product: any, showSoldOutBadges = true) {
  const now = new Date();
  const unitPrice = Number(product.unit_price || 0);
  const promoActive = isPromotionCurrentlyActive(product, now);
  const promotionalPrice = promoActive ? Number(product.promotional_price) : null;
  const effectivePrice = promotionalPrice !== null ? promotionalPrice : unitPrice;

  const trackInventory = Boolean(product.track_inventory);
  const availableQty = Math.max(0, Number(product.available_quantity ?? 0));
  const threshold = Math.max(0, Number(product.low_stock_threshold ?? 5));
  const isPublished = product.status === 'ACTIVE' && product.publication_status === 'PUBLISHED';

  const isAvailable =
    isPublished &&
    product.stock_status !== 'OUT_OF_STOCK' &&
    (!trackInventory || availableQty > 0);

  let derivedStockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
  if (!isAvailable) {
    derivedStockStatus = 'OUT_OF_STOCK';
  } else if (
    product.stock_status === 'LOW_STOCK' ||
    (trackInventory && availableQty <= threshold)
  ) {
    derivedStockStatus = 'LOW_STOCK';
  }

  const imagesParsed = safeJsonParse<string[]>(product.images_json, []);
  const primaryImage = product.primary_image_url || imagesParsed[0] || null;
  const images = Array.from(
    new Set([primaryImage, ...imagesParsed].filter((u): u is string => Boolean(u && typeof u === 'string')))
  );

  const rawVariants = safeJsonParse<ProductVariant[]>(product.variants_json, []);
  const variants = Array.isArray(rawVariants)
    ? rawVariants.map((v, idx) => ({
        id: String(v.id || `var-${idx + 1}`),
        name: String(v.name || v.value || `Option ${idx + 1}`),
        type: v.type ? String(v.type) : 'Option',
        value: v.value ? String(v.value) : String(v.name || ''),
        price:
          v.price !== null && v.price !== undefined && Number.isFinite(Number(v.price))
            ? Number(v.price)
            : null,
        stockQuantity:
          v.stockQuantity !== null && v.stockQuantity !== undefined && Number.isFinite(Number(v.stockQuantity))
            ? Math.max(0, Number(v.stockQuantity))
            : null,
        sku: v.sku ? String(v.sku) : null,
      }))
    : [];

  return {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name,
    sku: product.sku || null,
    description: product.description || null,
    category: product.category || 'General',
    brand: product.brand || null,
    currency: product.currency || 'TZS',
    unitPrice,
    promotionalPrice,
    effectivePrice,
    isPromotionActive: promoActive,
    promotionStartAt: product.promotion_start_at || null,
    promotionEndAt: product.promotion_end_at || null,
    trackInventory,
    availableQuantity: trackInventory ? availableQty : null,
    stockStatus: derivedStockStatus,
    isAvailable,
    showSoldOutBadge: Boolean(showSoldOutBadges && !isAvailable),
    isFeatured: Boolean(product.is_featured),
    primaryImageUrl: primaryImage,
    images,
    variants,
    createdAt: product.created_at,
  };
}

function serializeMerchantProduct(product: any) {
  const pub = serializePublicProduct(product, true);
  return {
    ...pub,
    costPrice: product.cost_price !== null && product.cost_price !== undefined ? Number(product.cost_price) : null,
    availableQuantityRaw: Number(product.available_quantity ?? 0),
    lowStockThreshold: Number(product.low_stock_threshold ?? 5),
    publicationStatus: product.publication_status || 'DRAFT',
    status: product.status || 'ACTIVE',
    updatedAt: product.updated_at || product.created_at,
  };
}

function serializePublicStore(store: any) {
  return {
    storeName: store.store_name,
    slug: store.slug,
    description: store.description || null,
    logoUrl: store.logo_url || store.merchant?.logo_url || null,
    coverImageUrl: store.cover_image_url || null,
    primaryColor: store.primary_color || store.merchant?.brand_color || '#0F172A',
    secondaryColor: store.secondary_color || '#FF5500',
    contactPhone: store.contact_phone || store.merchant?.business_phone || null,
    whatsappNumber: store.whatsapp_number || store.merchant?.whatsapp_number || store.contact_phone || null,
    contactEmail: store.contact_email || store.merchant?.email || null,
    location: store.location || store.merchant?.location || null,
    socialLinks: safeJsonParse<StoreSocialLinks>(store.social_links_json, {}),
    promotionalBannerText: store.promotional_banner_text || null,
    showSoldOutBadges: Boolean(store.show_sold_out_badges),
    showOnTrackingPage: Boolean(store.show_on_tracking_page),
    publicationStatus: store.publication_status,
    publicUrl: getPublicStoreUrl(store.slug),
  };
}

export async function checkSlugAvailability(rawSlug: string, excludeMerchantId?: string) {
  const validation = validateStoreSlugFormat(rawSlug);
  if (!validation.valid) {
    return { available: false, slug: validation.slug, error: validation.error };
  }

  const existing = await (prisma as any).merchantStore.findUnique({
    where: { slug: validation.slug },
    select: { id: true, merchant_id: true },
  });

  const available = !existing || (Boolean(excludeMerchantId) && existing.merchant_id === excludeMerchantId);
  return {
    available,
    slug: validation.slug,
    error: available ? undefined : 'This store URL is already taken by another business.',
  };
}

export async function generateUniqueSlugForMerchant(storeName: string, excludeMerchantId?: string): Promise<string> {
  const base = generateStoreSlug(storeName);
  const firstCheck = await checkSlugAvailability(base, excludeMerchantId);
  if (firstCheck.available) return firstCheck.slug;

  for (let i = 2; i <= 20; i++) {
    const candidate = `${base.slice(0, 48)}-${i}`;
    const check = await checkSlugAvailability(candidate, excludeMerchantId);
    if (check.available) return check.slug;
  }

  return `${base.slice(0, 44)}-${crypto.randomBytes(2).toString('hex')}`;
}

export async function getMerchantStoreDashboard(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { store: true } as any,
  });

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  const store = (merchant as any).store || null;
  const suggestedSlug = store?.slug || (await generateUniqueSlugForMerchant(merchant.business_name, merchantId));

  const prefill = {
    storeName: merchant.business_name,
    suggestedSlug,
    description: `Welcome to ${merchant.business_name}. Browse our available products, latest prices, and contact or order directly.`,
    logoUrl: merchant.logo_url || null,
    primaryColor: merchant.brand_color && merchant.brand_color !== '#1E40AF' ? merchant.brand_color : '#0F172A',
    secondaryColor: '#FF5500',
    contactPhone: merchant.business_phone || '',
    whatsappNumber: merchant.whatsapp_number || merchant.business_phone || '',
    contactEmail: merchant.email || '',
    location: merchant.location || '',
    socialLinks: {
      website: merchant.website || '',
      instagram: '',
      facebook: '',
      tiktok: '',
    },
  };

  const products = await (prisma as any).product.findMany({
    where: { merchant_id: merchantId },
    orderBy: { created_at: 'desc' },
  });

  const publishedProducts = products.filter(
    (p: any) => p.status === 'ACTIVE' && p.publication_status === 'PUBLISHED'
  );
  const availableProducts = publishedProducts.filter((p: any) => serializePublicProduct(p).isAvailable);
  const unavailableProducts = publishedProducts.filter((p: any) => !serializePublicProduct(p).isAvailable);
  const draftProducts = products.filter((p: any) => p.publication_status === 'DRAFT' && p.status === 'ACTIVE');
  const archivedProducts = products.filter(
    (p: any) => p.publication_status === 'ARCHIVED' || p.status !== 'ACTIVE'
  );

  let analytics = {
    storeViews: 0,
    uniqueVisitors: 0,
    productViews: 0,
    storeLinkClicks: 0,
    whatsappClicks: 0,
    enquiriesCount: 0,
    storefrontOrdersCount: 0,
    confirmedOrdersCount: 0,
    completedOrdersCount: 0,
    conversionRate: null as number | null,
    mostViewedProducts: [] as Array<{
      productId: string;
      name: string;
      primaryImageUrl: string | null;
      views: number;
    }>,
  };

  let categories: any[] = [];
  let enquiries: any[] = [];
  let smsLogs: any[] = [];

  if (store) {
    const [
      storeViews,
      productViews,
      storeLinkClicks,
      whatsappClicks,
      enquiriesCount,
      visitorRows,
      productViewRows,
      catRows,
      enquiryRows,
      smsRows,
      storeOrders,
    ] = await Promise.all([
      (prisma as any).storeAnalyticsEvent.count({ where: { store_id: store.id, event_type: 'STORE_VIEW' } }),
      (prisma as any).storeAnalyticsEvent.count({ where: { store_id: store.id, event_type: 'PRODUCT_VIEW' } }),
      (prisma as any).storeAnalyticsEvent.count({ where: { store_id: store.id, event_type: 'STORE_LINK_CLICK' } }),
      (prisma as any).storeAnalyticsEvent.count({ where: { store_id: store.id, event_type: 'WHATSAPP_CLICK' } }),
      (prisma as any).storeProductEnquiry.count({ where: { store_id: store.id, enquiry_type: 'ENQUIRY' } }),
      (prisma as any).storeAnalyticsEvent.findMany({
        where: { store_id: store.id, visitor_id: { not: null } },
        select: { visitor_id: true },
        distinct: ['visitor_id'],
      }),
      (prisma as any).storeAnalyticsEvent.groupBy({
        by: ['product_id'],
        where: { store_id: store.id, event_type: 'PRODUCT_VIEW', product_id: { not: null } },
        _count: { product_id: true },
        orderBy: { _count: { product_id: 'desc' } },
        take: 5,
      }),
      (prisma as any).storeCategory.findMany({
        where: { store_id: store.id },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      }),
      (prisma as any).storeProductEnquiry.findMany({
        where: { store_id: store.id },
        orderBy: { created_at: 'desc' },
        take: 30,
        include: {
          product: { select: { id: true, name: true, primary_image_url: true } },
        },
      }),
      (prisma as any).storeSmsDispatchLog.findMany({
        where: { store_id: store.id },
        orderBy: { created_at: 'desc' },
        take: 30,
      }),
      (prisma as any).storeProductEnquiry.findMany({
        where: { store_id: store.id, order_id: { not: null } },
        select: { order_id: true },
      }),
    ]);

    const linkedOrderIds = Array.from(
      new Set((storeOrders || []).map((o: any) => o.order_id).filter(Boolean))
    ) as string[];

    let confirmedOrdersCount = 0;
    let completedOrdersCount = 0;

    if (linkedOrderIds.length > 0) {
      const [confCount, compCount] = await Promise.all([
        prisma.order.count({
          where: {
            id: { in: linkedOrderIds },
            merchant_id: merchantId,
            status: { in: ['CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'COMPLETED'] },
          },
        }),
        prisma.order.count({
          where: {
            id: { in: linkedOrderIds },
            merchant_id: merchantId,
            status: { in: ['DELIVERED', 'COMPLETED'] },
          },
        }),
      ]);
      confirmedOrdersCount = confCount;
      completedOrdersCount = compCount;
    }

    const productLookup = new Map<string, any>(products.map((p: any) => [p.id, p]));
    const mostViewedProducts = (productViewRows || [])
      .map((row: any) => {
        const prod = productLookup.get(row.product_id);
        return prod
          ? {
              productId: row.product_id,
              name: prod.name,
              primaryImageUrl: prod.primary_image_url || null,
              views: Number(row._count?.product_id || 0),
            }
          : null;
      })
      .filter(Boolean);

    analytics = {
      storeViews,
      uniqueVisitors: Array.isArray(visitorRows) ? visitorRows.length : 0,
      productViews,
      storeLinkClicks,
      whatsappClicks,
      enquiriesCount,
      storefrontOrdersCount: linkedOrderIds.length,
      confirmedOrdersCount,
      completedOrdersCount,
      conversionRate:
        storeViews > 0 ? Number(((linkedOrderIds.length / storeViews) * 100).toFixed(2)) : null,
      mostViewedProducts,
    };

    categories = catRows || [];
    enquiries = enquiryRows || [];
    smsLogs = smsRows || [];
  }

  return {
    store: store
      ? {
          id: store.id,
          merchantId: store.merchant_id,
          storeName: store.store_name,
          slug: store.slug,
          previousSlugs: safeJsonParse<string[]>(store.previous_slugs, []),
          description: store.description || '',
          logoUrl: store.logo_url || merchant.logo_url || null,
          coverImageUrl: store.cover_image_url || null,
          primaryColor: store.primary_color || '#0F172A',
          secondaryColor: store.secondary_color || '#FF5500',
          contactPhone: store.contact_phone || '',
          whatsappNumber: store.whatsapp_number || '',
          contactEmail: store.contact_email || '',
          location: store.location || '',
          socialLinks: safeJsonParse<StoreSocialLinks>(store.social_links_json, {}),
          promotionalBannerText: store.promotional_banner_text || '',
          showSoldOutBadges: Boolean(store.show_sold_out_badges),
          showOnTrackingPage: Boolean(store.show_on_tracking_page),
          includeLinkInTransactionalSms: Boolean(store.include_link_in_transactional_sms),
          storeSmsTemplate: store.store_sms_template || DEFAULT_STORE_SMS_TEMPLATE,
          publicationStatus: store.publication_status,
          suspensionReason: store.suspension_reason || null,
          publishedAt: store.published_at || null,
          publicUrl: getPublicStoreUrl(store.slug),
        }
      : null,
    prefill,
    stats: {
      totalProducts: products.length,
      totalPublished: publishedProducts.length,
      availableProducts: availableProducts.length,
      unavailableProducts: unavailableProducts.length,
      draftProducts: draftProducts.length,
      archivedProducts: archivedProducts.length,
    },
    analytics,
    categories,
    enquiries,
    smsLogs,
  };
}

export async function upsertMerchantStore(
  merchantId: string,
  userId: string,
  input: {
    storeName: string;
    slug?: string;
    description?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    contactPhone?: string | null;
    whatsappNumber?: string | null;
    contactEmail?: string | null;
    location?: string | null;
    socialLinks?: StoreSocialLinks;
    promotionalBannerText?: string | null;
    showSoldOutBadges?: boolean;
    showOnTrackingPage?: boolean;
    includeLinkInTransactionalSms?: boolean;
    storeSmsTemplate?: string;
    publicationStatus?: 'DRAFT' | 'PUBLISHED';
  }
) {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) throw new Error('Merchant not found');

  const existing = await (prisma as any).merchantStore.findUnique({
    where: { merchant_id: merchantId },
  });

  if (existing && existing.publication_status === 'SUSPENDED' && input.publicationStatus === 'PUBLISHED') {
    throw new Error('This store is suspended by platform administrators and cannot be published until restored.');
  }

  const desiredSlug = input.slug?.trim()
    ? input.slug.trim().toLowerCase()
    : existing?.slug || (await generateUniqueSlugForMerchant(input.storeName, merchantId));

  const slugCheck = await checkSlugAvailability(desiredSlug, merchantId);
  if (!slugCheck.available) {
    throw new Error(slugCheck.error || 'Store URL is unavailable.');
  }

  const previousSlugs = safeJsonParse<string[]>(existing?.previous_slugs, []);
  if (existing && existing.slug && existing.slug !== slugCheck.slug) {
    if (!previousSlugs.includes(existing.slug)) {
      previousSlugs.push(existing.slug);
    }
  }

  const targetPubStatus =
    existing?.publication_status === 'SUSPENDED'
      ? 'SUSPENDED'
      : input.publicationStatus === 'PUBLISHED'
      ? 'PUBLISHED'
      : input.publicationStatus === 'DRAFT'
      ? 'DRAFT'
      : existing?.publication_status || 'DRAFT';

  const contactPhone = input.contactPhone !== undefined ? input.contactPhone : existing?.contact_phone ?? merchant.business_phone;
  const whatsappNumber =
    input.whatsappNumber !== undefined
      ? input.whatsappNumber
      : existing?.whatsapp_number ?? merchant.whatsapp_number ?? merchant.business_phone;

  if (targetPubStatus === 'PUBLISHED' && (!input.storeName?.trim() || (!contactPhone && !whatsappNumber))) {
    throw new Error('Store name and at least a contact phone or WhatsApp number are required before publishing.');
  }

  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  const primaryColor = input.primaryColor && hexRegex.test(input.primaryColor)
    ? input.primaryColor
    : existing?.primary_color || '#0F172A';
  const secondaryColor = input.secondaryColor && hexRegex.test(input.secondaryColor)
    ? input.secondaryColor
    : existing?.secondary_color || '#FF5500';

  const payload = {
    store_name: input.storeName.trim(),
    slug: slugCheck.slug,
    previous_slugs: JSON.stringify(previousSlugs),
    description: input.description !== undefined ? input.description : existing?.description ?? null,
    logo_url: input.logoUrl !== undefined ? input.logoUrl : existing?.logo_url ?? merchant.logo_url ?? null,
    cover_image_url: input.coverImageUrl !== undefined ? input.coverImageUrl : existing?.cover_image_url ?? null,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    contact_phone: contactPhone,
    whatsapp_number: whatsappNumber,
    contact_email: input.contactEmail !== undefined ? input.contactEmail : existing?.contact_email ?? merchant.email ?? null,
    location: input.location !== undefined ? input.location : existing?.location ?? merchant.location ?? null,
    social_links_json:
      input.socialLinks !== undefined
        ? JSON.stringify(input.socialLinks)
        : existing?.social_links_json ?? null,
    promotional_banner_text:
      input.promotionalBannerText !== undefined
        ? input.promotionalBannerText
        : existing?.promotional_banner_text ?? null,
    show_sold_out_badges:
      input.showSoldOutBadges !== undefined
        ? input.showSoldOutBadges
        : existing?.show_sold_out_badges ?? true,
    show_on_tracking_page:
      input.showOnTrackingPage !== undefined
        ? input.showOnTrackingPage
        : existing?.show_on_tracking_page ?? true,
    include_link_in_transactional_sms:
      input.includeLinkInTransactionalSms !== undefined
        ? input.includeLinkInTransactionalSms
        : existing?.include_link_in_transactional_sms ?? false,
    store_sms_template:
      input.storeSmsTemplate !== undefined && input.storeSmsTemplate.trim()
        ? input.storeSmsTemplate.trim()
        : existing?.store_sms_template || DEFAULT_STORE_SMS_TEMPLATE,
    publication_status: targetPubStatus,
    published_at: targetPubStatus === 'PUBLISHED' ? existing?.published_at || new Date() : existing?.published_at || null,
  };

  const saved = existing
    ? await (prisma as any).merchantStore.update({
        where: { id: existing.id },
        data: payload,
      })
    : await (prisma as any).merchantStore.create({
        data: {
          merchant_id: merchantId,
          ...payload,
        },
      });

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: existing ? 'STORE_UPDATED' : 'STORE_CREATED',
      object_type: 'MERCHANT_STORE',
      object_id: saved.id,
      metadata: JSON.stringify({ slug: saved.slug, publicationStatus: saved.publication_status }),
    },
  });

  return saved;
}

export async function setStorePublicationStatus(
  merchantId: string,
  userId: string,
  status: 'DRAFT' | 'PUBLISHED'
) {
  const store = await (prisma as any).merchantStore.findUnique({ where: { merchant_id: merchantId } });
  if (!store) throw new Error('Create your store first before updating publication status.');

  if (store.publication_status === 'SUSPENDED') {
    throw new Error('This store has been suspended by an administrator and cannot be published.');
  }

  if (status === 'PUBLISHED') {
    if (!store.store_name?.trim() || !store.slug?.trim() || (!store.contact_phone && !store.whatsapp_number)) {
      throw new Error('Store name, unique URL slug, and contact phone or WhatsApp number are required to publish.');
    }
  }

  const updated = await (prisma as any).merchantStore.update({
    where: { id: store.id },
    data: {
      publication_status: status,
      published_at: status === 'PUBLISHED' ? store.published_at || new Date() : store.published_at,
    },
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: status === 'PUBLISHED' ? 'STORE_PUBLISHED' : 'STORE_UNPUBLISHED',
      object_type: 'MERCHANT_STORE',
      object_id: store.id,
      metadata: JSON.stringify({ slug: store.slug }),
    },
  });

  return updated;
}

export async function listStoreCategories(merchantId: string) {
  return (prisma as any).storeCategory.findMany({
    where: { merchant_id: merchantId },
    orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
  });
}

export async function upsertStoreCategory(
  merchantId: string,
  input: { id?: string; name: string; description?: string; displayOrder?: number; status?: string }
) {
  const store = await (prisma as any).merchantStore.findUnique({ where: { merchant_id: merchantId } });
  if (!store) throw new Error('Create your store first before managing categories.');

  const slug = generateStoreSlug(input.name);
  if (input.id) {
    const owned = await (prisma as any).storeCategory.findFirst({
      where: { id: input.id, merchant_id: merchantId },
    });
    if (!owned) throw new Error('Category not found');

    return (prisma as any).storeCategory.update({
      where: { id: owned.id },
      data: {
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        display_order: input.displayOrder ?? owned.display_order,
        status: input.status || owned.status,
      },
    });
  }

  return (prisma as any).storeCategory.create({
    data: {
      store_id: store.id,
      merchant_id: merchantId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      display_order: input.displayOrder ?? 0,
      status: input.status || 'ACTIVE',
    },
  });
}

export async function deleteStoreCategory(merchantId: string, categoryId: string) {
  const owned = await (prisma as any).storeCategory.findFirst({
    where: { id: categoryId, merchant_id: merchantId },
  });
  if (!owned) throw new Error('Category not found');

  await (prisma as any).storeCategory.delete({ where: { id: owned.id } });
  return { deleted: true };
}

export async function listMerchantStoreProducts(
  merchantId: string,
  filters?: { search?: string; publicationStatus?: string; category?: string }
) {
  const where: any = { merchant_id: merchantId };
  if (filters?.publicationStatus && filters.publicationStatus !== 'ALL') {
    where.publication_status = filters.publicationStatus;
  }
  if (filters?.category && filters.category !== 'ALL') {
    where.category = filters.category;
  }
  if (filters?.search?.trim()) {
    const s = filters.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { sku: { contains: s, mode: 'insensitive' } },
      { category: { contains: s, mode: 'insensitive' } },
      { brand: { contains: s, mode: 'insensitive' } },
    ];
  }

  const rows = await (prisma as any).product.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });

  return rows.map(serializeMerchantProduct);
}

export interface UpsertStoreProductInput {
  name: string;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  currency?: string;
  unitPrice: number;
  costPrice?: number | null;
  promotionalPrice?: number | null;
  promotionStartAt?: string | null;
  promotionEndAt?: string | null;
  availableQuantity?: number;
  trackInventory?: boolean;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lowStockThreshold?: number;
  publicationStatus?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured?: boolean;
  primaryImageUrl?: string | null;
  images?: string[];
  variants?: ProductVariant[];
}

function deriveStockStatus(params: {
  trackInventory: boolean;
  availableQuantity: number;
  lowStockThreshold: number;
  requestedStatus?: string;
}): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (params.requestedStatus === 'OUT_OF_STOCK') return 'OUT_OF_STOCK';
  if (params.trackInventory) {
    if (params.availableQuantity <= 0) return 'OUT_OF_STOCK';
    if (params.availableQuantity <= params.lowStockThreshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }
  if (params.requestedStatus === 'LOW_STOCK') return 'LOW_STOCK';
  return 'IN_STOCK';
}

export async function createStoreProduct(
  merchantId: string,
  userId: string,
  input: UpsertStoreProductInput
) {
  if (!input.name?.trim()) throw new Error('Product name is required.');
  if (!Number.isFinite(Number(input.unitPrice)) || Number(input.unitPrice) < 0) {
    throw new Error('Valid selling price is required.');
  }

  const trackInventory = Boolean(input.trackInventory);
  const availableQuantity = Math.max(0, Math.floor(Number(input.availableQuantity ?? 0)));
  const lowStockThreshold = Math.max(0, Math.floor(Number(input.lowStockThreshold ?? 5)));
  const stockStatus = deriveStockStatus({
    trackInventory,
    availableQuantity,
    lowStockThreshold,
    requestedStatus: input.stockStatus,
  });

  const imagesList = Array.isArray(input.images)
    ? input.images.filter((u): u is string => Boolean(u && typeof u === 'string'))
    : [];
  const primaryImage = input.primaryImageUrl || imagesList[0] || null;
  const pubStatus = input.publicationStatus || 'DRAFT';
  const slug = `${generateStoreSlug(input.name)}-${crypto.randomBytes(2).toString('hex')}`;

  const created = await (prisma as any).product.create({
    data: {
      merchant_id: merchantId,
      name: input.name.trim(),
      slug,
      sku: input.sku?.trim() || null,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      brand: input.brand?.trim() || null,
      currency: (input.currency || 'TZS').trim().toUpperCase(),
      unit_price: Number(input.unitPrice),
      cost_price:
        input.costPrice !== undefined && input.costPrice !== null && String(input.costPrice) !== ''
          ? Number(input.costPrice)
          : null,
      promotional_price:
        input.promotionalPrice !== undefined &&
        input.promotionalPrice !== null &&
        String(input.promotionalPrice) !== ''
          ? Number(input.promotionalPrice)
          : null,
      promotion_start_at: input.promotionStartAt ? new Date(input.promotionStartAt) : null,
      promotion_end_at: input.promotionEndAt ? new Date(input.promotionEndAt) : null,
      available_quantity: availableQuantity,
      track_inventory: trackInventory,
      stock_status: stockStatus,
      low_stock_threshold: lowStockThreshold,
      publication_status: pubStatus,
      is_featured: Boolean(input.isFeatured),
      primary_image_url: primaryImage,
      images_json: JSON.stringify(imagesList.length > 0 ? imagesList : primaryImage ? [primaryImage] : []),
      variants_json: input.variants ? JSON.stringify(input.variants) : null,
      status: pubStatus === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: 'STORE_PRODUCT_CREATED',
      object_type: 'PRODUCT',
      object_id: created.id,
      metadata: JSON.stringify({ name: created.name, publicationStatus: pubStatus }),
    },
  });

  return serializeMerchantProduct(created);
}

export async function updateStoreProduct(
  merchantId: string,
  userId: string,
  productId: string,
  input: Partial<UpsertStoreProductInput>
) {
  const existing = await (prisma as any).product.findFirst({
    where: { id: productId, merchant_id: merchantId },
  });
  if (!existing) throw new Error('Product not found');

  const trackInventory =
    input.trackInventory !== undefined ? Boolean(input.trackInventory) : Boolean(existing.track_inventory);
  const availableQuantity =
    input.availableQuantity !== undefined
      ? Math.max(0, Math.floor(Number(input.availableQuantity)))
      : Number(existing.available_quantity ?? 0);
  const lowStockThreshold =
    input.lowStockThreshold !== undefined
      ? Math.max(0, Math.floor(Number(input.lowStockThreshold)))
      : Number(existing.low_stock_threshold ?? 5);

  const stockStatus = deriveStockStatus({
    trackInventory,
    availableQuantity,
    lowStockThreshold,
    requestedStatus: input.stockStatus ?? (input.availableQuantity !== undefined ? undefined : existing.stock_status),
  });

  const imagesList =
    input.images !== undefined
      ? input.images.filter((u): u is string => Boolean(u && typeof u === 'string'))
      : safeJsonParse<string[]>(existing.images_json, []);
  const primaryImage =
    input.primaryImageUrl !== undefined
      ? input.primaryImageUrl || imagesList[0] || null
      : existing.primary_image_url || imagesList[0] || null;

  const pubStatus = input.publicationStatus || existing.publication_status || 'DRAFT';

  const updated = await (prisma as any).product.update({
    where: { id: existing.id },
    data: {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      sku: input.sku !== undefined ? input.sku?.trim() || null : existing.sku,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      category: input.category !== undefined ? input.category?.trim() || null : existing.category,
      brand: input.brand !== undefined ? input.brand?.trim() || null : existing.brand,
      currency: input.currency !== undefined ? input.currency.trim().toUpperCase() : existing.currency,
      unit_price: input.unitPrice !== undefined ? Number(input.unitPrice) : existing.unit_price,
      cost_price:
        input.costPrice !== undefined
          ? input.costPrice !== null && String(input.costPrice) !== ''
            ? Number(input.costPrice)
            : null
          : existing.cost_price,
      promotional_price:
        input.promotionalPrice !== undefined
          ? input.promotionalPrice !== null && String(input.promotionalPrice) !== ''
            ? Number(input.promotionalPrice)
            : null
          : existing.promotional_price,
      promotion_start_at:
        input.promotionStartAt !== undefined
          ? input.promotionStartAt
            ? new Date(input.promotionStartAt)
            : null
          : existing.promotion_start_at,
      promotion_end_at:
        input.promotionEndAt !== undefined
          ? input.promotionEndAt
            ? new Date(input.promotionEndAt)
            : null
          : existing.promotion_end_at,
      available_quantity: availableQuantity,
      track_inventory: trackInventory,
      stock_status: stockStatus,
      low_stock_threshold: lowStockThreshold,
      publication_status: pubStatus,
      is_featured: input.isFeatured !== undefined ? Boolean(input.isFeatured) : existing.is_featured,
      primary_image_url: primaryImage,
      images_json: JSON.stringify(imagesList.length > 0 ? imagesList : primaryImage ? [primaryImage] : []),
      variants_json:
        input.variants !== undefined ? JSON.stringify(input.variants) : existing.variants_json,
      status: pubStatus === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: 'STORE_PRODUCT_UPDATED',
      object_type: 'PRODUCT',
      object_id: updated.id,
      metadata: JSON.stringify({ publicationStatus: updated.publication_status, stockStatus: updated.stock_status }),
    },
  });

  return serializeMerchantProduct(updated);
}

async function resolvePublishedStoreBySlugOrRedirect(rawSlug: string) {
  const slug = String(rawSlug || '').trim().toLowerCase();
  if (!slug) return { status: 'NOT_FOUND' as const };

  const store = await (prisma as any).merchantStore.findUnique({
    where: { slug },
    include: {
      merchant: {
        select: {
          business_name: true,
          business_phone: true,
          email: true,
          location: true,
          logo_url: true,
          brand_color: true,
          whatsapp_number: true,
          status: true,
        },
      },
    },
  });

  if (!store) {
    // Preserve redirects from previously published store slugs
    const candidateStores = await (prisma as any).merchantStore.findMany({
      where: {
        publication_status: 'PUBLISHED',
        previous_slugs: { contains: slug },
      },
      select: { slug: true, previous_slugs: true },
    });

    for (const cand of candidateStores || []) {
      const prev = safeJsonParse<string[]>(cand.previous_slugs, []);
      if (prev.includes(slug)) {
        return { status: 'REDIRECT' as const, redirectSlug: cand.slug };
      }
    }
    return { status: 'NOT_FOUND' as const };
  }

  if (store.publication_status === 'SUSPENDED' || store.merchant?.status !== 'ACTIVE') {
    return { status: 'SUSPENDED' as const, storeName: store.store_name };
  }

  if (store.publication_status !== 'PUBLISHED') {
    return { status: 'NOT_FOUND' as const };
  }

  return { status: 'VALID' as const, store };
}

export async function getPublicStoreBySlug(
  rawSlug: string,
  options?: { category?: string; search?: string; sort?: string; featuredOnly?: boolean }
) {
  const resolved = await resolvePublishedStoreBySlugOrRedirect(rawSlug);
  if (resolved.status !== 'VALID') {
    return resolved;
  }

  const store = resolved.store;
  const where: any = {
    merchant_id: store.merchant_id,
    status: 'ACTIVE',
    publication_status: 'PUBLISHED',
  };

  if (options?.featuredOnly) {
    where.is_featured = true;
  }
  if (options?.category && options.category !== 'ALL') {
    where.category = options.category;
  }
  if (options?.search?.trim()) {
    const s = options.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
      { category: { contains: s, mode: 'insensitive' } },
      { brand: { contains: s, mode: 'insensitive' } },
    ];
  }

  let orderBy: any = [{ is_featured: 'desc' }, { created_at: 'desc' }];
  if (options?.sort === 'price_asc') orderBy = { unit_price: 'asc' };
  if (options?.sort === 'price_desc') orderBy = { unit_price: 'desc' };
  if (options?.sort === 'newest') orderBy = { created_at: 'desc' };

  const [products, customCategories] = await Promise.all([
    (prisma as any).product.findMany({ where, orderBy }),
    (prisma as any).storeCategory.findMany({
      where: { store_id: store.id, status: 'ACTIVE' },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    }),
  ]);

  const serializedProducts = products.map((p: any) => serializePublicProduct(p, store.show_sold_out_badges));
  const categoryNames = Array.from(
    new Set([
      ...(customCategories || []).map((c: any) => c.name),
      ...serializedProducts.map((p: any) => p.category).filter(Boolean),
    ])
  );

  return {
    status: 'VALID' as const,
    store: serializePublicStore(store),
    categories: categoryNames,
    products: serializedProducts,
  };
}

export async function getPublicStoreProduct(rawSlug: string, productIdOrSlug: string) {
  const resolved = await resolvePublishedStoreBySlugOrRedirect(rawSlug);
  if (resolved.status !== 'VALID') return resolved;

  const store = resolved.store;
  const product = await (prisma as any).product.findFirst({
    where: {
      merchant_id: store.merchant_id,
      status: 'ACTIVE',
      publication_status: 'PUBLISHED',
      OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }],
    },
  });

  if (!product) return { status: 'PRODUCT_NOT_FOUND' as const, store: serializePublicStore(store) };

  const relatedRaw = await (prisma as any).product.findMany({
    where: {
      merchant_id: store.merchant_id,
      status: 'ACTIVE',
      publication_status: 'PUBLISHED',
      id: { not: product.id },
      ...(product.category ? { category: product.category } : {}),
    },
    orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
    take: 4,
  });

  return {
    status: 'VALID' as const,
    store: serializePublicStore(store),
    product: serializePublicProduct(product, store.show_sold_out_badges),
    relatedProducts: (relatedRaw || []).map((p: any) => serializePublicProduct(p, store.show_sold_out_badges)),
  };
}

const ALLOWED_PUBLIC_EVENTS = new Set([
  'STORE_VIEW',
  'PRODUCT_VIEW',
  'STORE_LINK_CLICK',
  'WHATSAPP_CLICK',
  'CALL_CLICK',
  'TRACKING_RECOMMENDATION_CLICK',
]);

export async function recordPublicStoreEvent(
  rawSlug: string,
  input: { eventType: string; productId?: string; visitorId?: string; referrer?: string; metadata?: any }
) {
  if (!ALLOWED_PUBLIC_EVENTS.has(input.eventType)) return { recorded: false };

  const resolved = await resolvePublishedStoreBySlugOrRedirect(rawSlug);
  if (resolved.status !== 'VALID') return { recorded: false };

  const store = resolved.store;
  let validProductId: string | null = null;
  if (input.productId) {
    const prod = await (prisma as any).product.findFirst({
      where: { id: input.productId, merchant_id: store.merchant_id, publication_status: 'PUBLISHED' },
      select: { id: true },
    });
    if (prod) validProductId = prod.id;
  }

  await (prisma as any).storeAnalyticsEvent.create({
    data: {
      store_id: store.id,
      merchant_id: store.merchant_id,
      product_id: validProductId,
      event_type: input.eventType,
      visitor_id: input.visitorId ? String(input.visitorId).slice(0, 120) : null,
      referrer: input.referrer ? String(input.referrer).slice(0, 300) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });

  return { recorded: true };
}

export async function submitPublicStoreOrderOrEnquiry(
  rawSlug: string,
  input: {
    type: 'ORDER_REQUEST' | 'ENQUIRY';
    productId: string;
    quantity?: number;
    selectedVariantId?: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string;
    message?: string;
  }
) {
  const resolved = await resolvePublishedStoreBySlugOrRedirect(rawSlug);
  if (resolved.status !== 'VALID') {
    throw new Error('This merchant store is unavailable.');
  }

  const store = resolved.store;
  const product = await (prisma as any).product.findFirst({
    where: {
      id: input.productId,
      merchant_id: store.merchant_id,
      status: 'ACTIVE',
      publication_status: 'PUBLISHED',
    },
  });

  if (!product) {
    throw new Error('This product is no longer available.');
  }

  const serialized = serializePublicProduct(product, store.show_sold_out_badges);
  const qty = Math.max(1, Math.min(1000, Math.floor(Number(input.quantity || 1))));

  if (input.type === 'ENQUIRY') {
    const enquiry = await (prisma as any).storeProductEnquiry.create({
      data: {
        store_id: store.id,
        merchant_id: store.merchant_id,
        product_id: product.id,
        customer_name: input.customerName.trim(),
        customer_phone: input.customerPhone.trim(),
        delivery_address: input.deliveryAddress?.trim() || null,
        quantity: qty,
        selected_variant: input.selectedVariantId || null,
        message: input.message?.trim() || null,
        enquiry_type: 'ENQUIRY',
        status: 'NEW',
      },
    });

    await (prisma as any).storeAnalyticsEvent.create({
      data: {
        store_id: store.id,
        merchant_id: store.merchant_id,
        product_id: product.id,
        event_type: 'PRODUCT_ENQUIRY',
        metadata: JSON.stringify({ enquiryId: enquiry.id, quantity: qty }),
      },
    });

    return { type: 'ENQUIRY', enquiryId: enquiry.id };
  }

  // ORDER_REQUEST validation against live stock & authoritative DB prices
  if (!serialized.isAvailable) {
    throw new Error('Sorry, this product is currently out of stock.');
  }

  let selectedVariantLabel: string | null = null;
  let unitPrice = serialized.effectivePrice;

  if (input.selectedVariantId && serialized.variants.length > 0) {
    const variant = serialized.variants.find(
      (v) => v.id === input.selectedVariantId || v.name === input.selectedVariantId
    );
    if (!variant) throw new Error('Selected product variation is invalid.');
    if (variant.stockQuantity !== null && variant.stockQuantity < qty) {
      throw new Error(`Only ${variant.stockQuantity} unit(s) available for ${variant.name}.`);
    }
    if (variant.price !== null && variant.price > 0) {
      unitPrice = variant.price;
    }
    selectedVariantLabel = variant.name;
  }

  if (product.track_inventory && Number(product.available_quantity) < qty) {
    throw new Error(`Only ${product.available_quantity} unit(s) currently available in stock.`);
  }

  if (!input.deliveryAddress?.trim()) {
    throw new Error('Delivery address is required to place an order request.');
  }

  const merchantOwner = await prisma.merchantUser.findFirst({
    where: { merchant_id: store.merchant_id, status: 'ACTIVE' },
    orderBy: { created_at: 'asc' },
  });

  const actorUserId = merchantOwner?.id || 'STOREFRONT_PUBLIC';
  const productLabel = selectedVariantLabel ? `${product.name} (${selectedVariantLabel})` : product.name;

  const createdOrderRes = await orderService.createOrder({
    merchantId: store.merchant_id,
    userId: actorUserId,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    deliveryAddress: input.deliveryAddress.trim(),
    productName: productLabel,
    imageUrl: serialized.primaryImageUrl || undefined,
    currency: serialized.currency,
    paymentStatus: 'UNPAID',
    items: [
      {
        productId: product.id,
        productName: productLabel,
        description: product.description || undefined,
        sku: product.sku || undefined,
        category: product.category || undefined,
        unitSellingPrice: unitPrice,
        quantity: qty,
      },
    ],
  });

  if (product.track_inventory) {
    const nextQty = Math.max(0, Number(product.available_quantity) - qty);
    const nextStockStatus = deriveStockStatus({
      trackInventory: true,
      availableQuantity: nextQty,
      lowStockThreshold: Number(product.low_stock_threshold ?? 5),
    });
    await (prisma as any).product.update({
      where: { id: product.id },
      data: { available_quantity: nextQty, stock_status: nextStockStatus },
    });
  }

  const enquiry = await (prisma as any).storeProductEnquiry.create({
    data: {
      store_id: store.id,
      merchant_id: store.merchant_id,
      product_id: product.id,
      order_id: createdOrderRes.order.id,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      delivery_address: input.deliveryAddress.trim(),
      quantity: qty,
      selected_variant: selectedVariantLabel,
      message: input.message?.trim() || null,
      enquiry_type: 'ORDER_REQUEST',
      status: 'CONVERTED_TO_ORDER',
    },
  });

  await (prisma as any).storeAnalyticsEvent.create({
    data: {
      store_id: store.id,
      merchant_id: store.merchant_id,
      product_id: product.id,
      order_id: createdOrderRes.order.id,
      event_type: 'STOREFRONT_ORDER_REQUEST',
      metadata: JSON.stringify({ enquiryId: enquiry.id, orderNumber: createdOrderRes.order.order_number }),
    },
  });

  return {
    type: 'ORDER_REQUEST',
    orderNumber: createdOrderRes.order.order_number,
    trackingUrl: createdOrderRes.tracking_url,
    enquiryId: enquiry.id,
  };
}

/**
 * Retrieves merchant-owned store recommendations for the delivery tracking page.
 * Never returns products from another merchant or unpublished products.
 */
export async function getTrackingStoreRecommendations(merchantId: string) {
  if (!merchantId || !(prisma as any).merchantStore?.findUnique) return null;

  const store = await (prisma as any).merchantStore.findUnique({
    where: { merchant_id: merchantId },
    include: {
      merchant: {
        select: {
          business_name: true,
          logo_url: true,
          brand_color: true,
          whatsapp_number: true,
          status: true,
        },
      },
    },
  });

  if (
    !store ||
    store.publication_status !== 'PUBLISHED' ||
    !store.show_on_tracking_page ||
    store.merchant?.status !== 'ACTIVE'
  ) {
    return null;
  }

  const productsRaw = await (prisma as any).product.findMany({
    where: {
      merchant_id: merchantId,
      status: 'ACTIVE',
      publication_status: 'PUBLISHED',
    },
    orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
    take: 8,
  });

  const products = (productsRaw || [])
    .map((p: any) => serializePublicProduct(p, store.show_sold_out_badges))
    .filter((p: any) => p.isAvailable)
    .slice(0, 4);

  if (products.length === 0) return null;

  return {
    store: serializePublicStore(store),
    products,
  };
}

export async function getBuyAgainOrderPreview(trackingToken: string) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ tracking_token: trackingToken }, { order_number: trackingToken }],
    },
    include: {
      items: true,
      merchant: {
        select: {
          business_name: true,
          status: true,
          store: true,
        } as any,
      },
    },
  });

  if (!order || !(order.merchant as any)?.store) {
    return null;
  }

  const store = (order.merchant as any).store;
  if (store.publication_status !== 'PUBLISHED' || (order.merchant as any)?.status !== 'ACTIVE') {
    return null;
  }

  const productIds = order.items.map((it) => it.product_id).filter(Boolean) as string[];
  const productNames = order.items.map((it) => it.product_name_snapshot).filter(Boolean);

  const liveProducts = await (prisma as any).product.findMany({
    where: {
      merchant_id: order.merchant_id,
      status: 'ACTIVE',
      publication_status: 'PUBLISHED',
      OR: [
        ...(productIds.length > 0 ? [{ id: { in: productIds } }] : []),
        ...(productNames.length > 0 ? [{ name: { in: productNames } }] : []),
        { name: order.product_name },
      ],
    },
  });

  const byId = new Map<string, any>(liveProducts.map((p: any) => [p.id, p]));
  const byName = new Map<string, any>(liveProducts.map((p: any) => [p.name.toLowerCase(), p]));

  const sourceItems =
    order.items.length > 0
      ? order.items.map((it) => ({
          productId: it.product_id,
          name: it.product_name_snapshot,
          quantity: it.quantity,
          previousUnitPrice: Number(it.unit_selling_price),
        }))
      : [
          {
            productId: null,
            name: order.product_name,
            quantity: 1,
            previousUnitPrice: Number(order.amount || 0),
          },
        ];

  const items = sourceItems.map((src) => {
    const matched =
      (src.productId ? byId.get(src.productId) : null) ||
      byName.get(String(src.name || '').toLowerCase()) ||
      null;

    if (!matched) {
      return {
        productId: src.productId || null,
        name: src.name,
        requestedQuantity: src.quantity,
        previousUnitPrice: src.previousUnitPrice,
        currentUnitPrice: null,
        currency: order.currency || 'TZS',
        isAvailable: false,
        unavailableReason: 'No longer published in storefront',
        primaryImageUrl: null,
      };
    }

    const serialized = serializePublicProduct(matched, store.show_sold_out_badges);
    return {
      productId: serialized.id,
      name: serialized.name,
      requestedQuantity: src.quantity,
      previousUnitPrice: src.previousUnitPrice,
      currentUnitPrice: serialized.effectivePrice,
      priceChanged: serialized.effectivePrice !== src.previousUnitPrice,
      currency: serialized.currency,
      isAvailable: serialized.isAvailable,
      maxQuantity: serialized.trackInventory ? serialized.availableQuantity : null,
      unavailableReason: serialized.isAvailable ? null : 'Out of stock',
      primaryImageUrl: serialized.primaryImageUrl,
    };
  });

  return {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    deliveryAddress: order.delivery_address,
    store: serializePublicStore(store),
    items,
  };
}

export async function submitBuyAgainOrder(
  trackingToken: string,
  input: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    items: Array<{ productId: string; quantity: number }>;
  }
) {
  if (!input.items || input.items.length === 0) {
    throw new Error('Please select at least one available product to reorder.');
  }

  const origOrder = await prisma.order.findFirst({
    where: { OR: [{ tracking_token: trackingToken }, { order_number: trackingToken }] },
    include: { merchant: { include: { store: true } as any } },
  });

  if (!origOrder || !(origOrder.merchant as any)?.store) {
    throw new Error('Original order or merchant store not found.');
  }

  const store = (origOrder.merchant as any).store;
  if (store.publication_status !== 'PUBLISHED' || origOrder.merchant.status !== 'ACTIVE') {
    throw new Error('This merchant store is currently unavailable for reorders.');
  }

  const requestedIds = input.items.map((it) => it.productId);
  const dbProducts = await (prisma as any).product.findMany({
    where: {
      id: { in: requestedIds },
      merchant_id: origOrder.merchant_id,
      status: 'ACTIVE',
      publication_status: 'PUBLISHED',
    },
  });

  const prodMap = new Map<string, any>(dbProducts.map((p: any) => [p.id, p]));
  const preparedItems: orderService.OrderItemInput[] = [];
  const summaryNames: string[] = [];

  for (const reqItem of input.items) {
    const qty = Math.max(1, Math.min(1000, Math.floor(Number(reqItem.quantity || 1))));
    const prod = prodMap.get(reqItem.productId);
    if (!prod) {
      throw new Error('One or more selected products are no longer available.');
    }
    const serialized = serializePublicProduct(prod, store.show_sold_out_badges);
    if (!serialized.isAvailable) {
      throw new Error(`${prod.name} is currently out of stock.`);
    }
    if (prod.track_inventory && Number(prod.available_quantity) < qty) {
      throw new Error(`Only ${prod.available_quantity} unit(s) available for ${prod.name}.`);
    }

    preparedItems.push({
      productId: prod.id,
      productName: prod.name,
      description: prod.description || undefined,
      sku: prod.sku || undefined,
      category: prod.category || undefined,
      unitSellingPrice: serialized.effectivePrice,
      quantity: qty,
    });
    summaryNames.push(`${prod.name} x${qty}`);
  }

  const merchantOwner = await prisma.merchantUser.findFirst({
    where: { merchant_id: origOrder.merchant_id, status: 'ACTIVE' },
    orderBy: { created_at: 'asc' },
  });

  const createdOrderRes = await orderService.createOrder({
    merchantId: origOrder.merchant_id,
    userId: merchantOwner?.id || 'STOREFRONT_BUY_AGAIN',
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    deliveryAddress: input.deliveryAddress.trim(),
    productName: summaryNames.join(', ').slice(0, 180),
    currency: preparedItems.length > 0 ? origOrder.currency || 'TZS' : 'TZS',
    paymentStatus: 'UNPAID',
    items: preparedItems,
  });

  for (const item of preparedItems) {
    const prod = prodMap.get(item.productId!);
    if (prod?.track_inventory) {
      const nextQty = Math.max(0, Number(prod.available_quantity) - (item.quantity || 1));
      await (prisma as any).product.update({
        where: { id: prod.id },
        data: {
          available_quantity: nextQty,
          stock_status: deriveStockStatus({
            trackInventory: true,
            availableQuantity: nextQty,
            lowStockThreshold: Number(prod.low_stock_threshold ?? 5),
          }),
        },
      });
    }
  }

  await (prisma as any).storeProductEnquiry.create({
    data: {
      store_id: store.id,
      merchant_id: origOrder.merchant_id,
      product_id: preparedItems[0]?.productId || null,
      order_id: createdOrderRes.order.id,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      delivery_address: input.deliveryAddress.trim(),
      quantity: preparedItems.reduce((acc, it) => acc + (it.quantity || 1), 0),
      enquiry_type: 'BUY_AGAIN',
      status: 'CONVERTED_TO_ORDER',
    },
  });

  await (prisma as any).storeAnalyticsEvent.create({
    data: {
      store_id: store.id,
      merchant_id: origOrder.merchant_id,
      order_id: createdOrderRes.order.id,
      event_type: 'BUY_AGAIN_ORDER_REQUEST',
      metadata: JSON.stringify({
        originalOrderNumber: origOrder.order_number,
        newOrderNumber: createdOrderRes.order.order_number,
      }),
    },
  });

  return {
    orderNumber: createdOrderRes.order.order_number,
    trackingUrl: createdOrderRes.tracking_url,
  };
}

export function renderStoreSmsTemplate(
  template: string,
  vars: {
    customerName: string;
    businessName: string;
    storeName: string;
    storeLink: string;
    customerPhone: string;
  }
): string {
  return String(template || DEFAULT_STORE_SMS_TEMPLATE)
    .replace(/\[Customer Name\]/gi, vars.customerName || 'Customer')
    .replace(/\[Business Name\]/gi, vars.businessName || 'Our Store')
    .replace(/\[Store Name\]/gi, vars.storeName || vars.businessName || 'Our Store')
    .replace(/\[Store Link\]/gi, vars.storeLink)
    .replace(/\[Customer Phone\]/gi, vars.customerPhone || '');
}

async function refundStoreSmsCredits(params: {
  merchantId: string;
  units: number;
  reason: string;
  reference: string;
}) {
  if (!params.units || params.units <= 0 || !(prisma as any).merchantSmsAccount) return;
  try {
    await prisma.$transaction(async (tx: any) => {
      const account = await tx.merchantSmsAccount.findUnique({
        where: { merchant_id: params.merchantId },
      });
      if (!account) return;
      const balanceBefore = account.available_credits;
      const balanceAfter = balanceBefore + params.units;
      await tx.merchantSmsAccount.update({
        where: { id: account.id },
        data: {
          available_credits: balanceAfter,
          total_consumed: Math.max(0, account.total_consumed - params.units),
        },
      });
      await tx.smsCreditLedger.create({
        data: {
          merchant_id: params.merchantId,
          amount: params.units,
          type: 'REFUND',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference: params.reference,
          reason: params.reason,
        },
      });
    });
  } catch (err) {
    console.error('[STORE SMS CREDIT REFUND ERROR]', err);
  }
}

export async function updateCustomerMarketingConsent(
  merchantId: string,
  customerId: string,
  optIn: boolean,
  source = 'MERCHANT_DASHBOARD'
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, merchant_id: merchantId },
  });
  if (!customer) throw new Error('Customer not found');

  const now = new Date();
  return (prisma as any).customer.update({
    where: { id: customer.id },
    data: {
      marketing_opt_in: Boolean(optIn),
      marketing_opt_in_at: optIn ? now : (customer as any).marketing_opt_in_at,
      marketing_opt_out_at: !optIn ? now : null,
      marketing_consent_source: source,
    },
  });
}

export async function listStoreCustomersWithConsent(merchantId: string) {
  return (prisma as any).customer.findMany({
    where: { merchant_id: merchantId },
    orderBy: { created_at: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      phone: true,
      marketing_opt_in: true,
      marketing_opt_in_at: true,
      marketing_opt_out_at: true,
      marketing_consent_source: true,
    },
  });
}

export async function sendStoreLinkSms(
  merchantId: string,
  userId: string,
  input: {
    customerIds?: string[];
    recipientPhone?: string;
    recipientName?: string;
    customTemplate?: string;
    explicitConsentConfirmed?: boolean;
  }
) {
  const store = await (prisma as any).merchantStore.findUnique({
    where: { merchant_id: merchantId },
    include: { merchant: true },
  });

  if (!store) throw new Error('Create your store first before sharing via SMS.');
  if (store.publication_status !== 'PUBLISHED') {
    throw new Error('Publish your store before sending store links via SMS.');
  }

  const storeUrl = getPublicStoreUrl(store.slug);
  const template = input.customTemplate?.trim() || store.store_sms_template || DEFAULT_STORE_SMS_TEMPLATE;
  const businessName = store.merchant?.business_name || store.store_name;

  type TargetRecipient = { customerId?: string | null; name: string; phone: string };
  const targets: TargetRecipient[] = [];

  if (input.customerIds && input.customerIds.length > 0) {
    const customers = await (prisma as any).customer.findMany({
      where: { id: { in: input.customerIds }, merchant_id: merchantId },
    });

    for (const c of customers || []) {
      if (!c.marketing_opt_in) {
        continue; // Enforce marketing opt-in consent strictly
      }
      targets.push({ customerId: c.id, name: c.name, phone: c.phone });
    }
    if (targets.length === 0) {
      throw new Error(
        'None of the selected customers have promotional SMS opt-in enabled. Enable opt-in with customer consent first.'
      );
    }
  } else if (input.recipientPhone?.trim()) {
    const cleanPhone = normalizePhone(input.recipientPhone) || input.recipientPhone.trim();
    const existingCustomer = await (prisma as any).customer.findFirst({
      where: { merchant_id: merchantId, phone: cleanPhone },
    });

    if (existingCustomer && existingCustomer.marketing_opt_out_at && !existingCustomer.marketing_opt_in) {
      throw new Error('This customer has opted out of promotional SMS messages.');
    }
    if ((!existingCustomer || !existingCustomer.marketing_opt_in) && !input.explicitConsentConfirmed) {
      throw new Error('Customer promotional SMS opt-in consent is required before sending store links.');
    }

    targets.push({
      customerId: existingCustomer?.id || null,
      name: input.recipientName?.trim() || existingCustomer?.name || 'Customer',
      phone: cleanPhone,
    });
  } else {
    throw new Error('Provide customerIds or a recipientPhone to send the store SMS.');
  }

  const adapter = new MesejiSMSAdapter();
  const results: any[] = [];

  for (const target of targets) {
    // Prevent duplicate SMS sends to same phone within 60 seconds
    const recentDup = await (prisma as any).storeSmsDispatchLog.findFirst({
      where: {
        store_id: store.id,
        recipient_phone: target.phone,
        status: { in: ['QUEUED', 'SENT', 'DELIVERED'] },
        created_at: { gte: new Date(Date.now() - 60000) },
      },
    });

    if (recentDup) {
      results.push({
        recipientPhone: target.phone,
        status: 'SKIPPED_DUPLICATE',
        reason: 'Store link SMS already sent to this number within the last 60 seconds.',
      });
      continue;
    }

    const messageBody = renderStoreSmsTemplate(template, {
      customerName: target.name,
      businessName,
      storeName: store.store_name,
      storeLink: storeUrl,
      customerPhone: target.phone,
    });

    const deductRes = await smsManagementService.deductCredits({
      merchantId,
      messageBody,
      reason: `SmartTrack Store link SMS (${store.slug})`,
      reference: store.id,
    });

    if (!deductRes.allowed) {
      const reason = `Insufficient merchant SMS credits (${deductRes.remainingCredits} available, needed ${deductRes.units}).`;
      const log = await (prisma as any).storeSmsDispatchLog.create({
        data: {
          store_id: store.id,
          merchant_id: merchantId,
          customer_id: target.customerId || null,
          recipient_name: target.name,
          recipient_phone: target.phone,
          store_url: storeUrl,
          message_body: messageBody,
          status: 'FAILED',
          units_billed: 0,
          failure_reason: reason,
        },
      });
      results.push({ ...log, status: 'FAILED' });
      continue;
    }

    const smsResult = await adapter.sendSMS(target.phone, messageBody);
    const now = new Date();

    if (smsResult.success) {
      const log = await (prisma as any).storeSmsDispatchLog.create({
        data: {
          store_id: store.id,
          merchant_id: merchantId,
          customer_id: target.customerId || null,
          recipient_name: target.name,
          recipient_phone: target.phone,
          store_url: storeUrl,
          message_body: messageBody,
          status: 'SENT',
          units_billed: deductRes.units,
          provider_message_id: smsResult.messageId || null,
          provider_response: JSON.stringify(smsResult),
          sent_at: now,
        },
      });
      results.push(log);
    } else {
      await refundStoreSmsCredits({
        merchantId,
        units: deductRes.units,
        reason: `Refund failed Store SMS to ${target.phone}`,
        reference: store.id,
      });

      const log = await (prisma as any).storeSmsDispatchLog.create({
        data: {
          store_id: store.id,
          merchant_id: merchantId,
          customer_id: target.customerId || null,
          recipient_name: target.name,
          recipient_phone: target.phone,
          store_url: storeUrl,
          message_body: messageBody,
          status: 'FAILED',
          units_billed: 0,
          provider_response: JSON.stringify(smsResult),
          failure_reason: smsResult.error || 'SMS provider rejected request.',
        },
      });
      results.push(log);
    }
  }

  await prisma.auditLog.create({
    data: {
      merchant_id: merchantId,
      user_id: userId,
      action: 'STORE_LINK_SMS_DISPATCHED',
      object_type: 'MERCHANT_STORE',
      object_id: store.id,
      metadata: JSON.stringify({ recipientCount: targets.length }),
    },
  });

  return {
    storeUrl,
    sentCount: results.filter((r) => r.status === 'SENT').length,
    failedCount: results.filter((r) => r.status === 'FAILED').length,
    skippedCount: results.filter((r) => r.status === 'SKIPPED_DUPLICATE').length,
    results,
  };
}

export async function generateStoreQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    width: 320,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

export async function listAdminStores(filters: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 25));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.status && filters.status !== 'ALL') {
    where.publication_status = filters.status;
  }
  if (filters.search?.trim()) {
    const s = filters.search.trim();
    where.OR = [
      { store_name: { contains: s, mode: 'insensitive' } },
      { slug: { contains: s, mode: 'insensitive' } },
      { merchant: { business_name: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [totalStores, publishedStores, draftStores, suspendedStores, count, stores] = await Promise.all([
    (prisma as any).merchantStore.count(),
    (prisma as any).merchantStore.count({ where: { publication_status: 'PUBLISHED' } }),
    (prisma as any).merchantStore.count({ where: { publication_status: 'DRAFT' } }),
    (prisma as any).merchantStore.count({ where: { publication_status: 'SUSPENDED' } }),
    (prisma as any).merchantStore.count({ where }),
    (prisma as any).merchantStore.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: 'desc' },
      include: {
        merchant: {
          select: {
            id: true,
            business_name: true,
            business_phone: true,
            status: true,
            _count: { select: { products: true } },
          },
        },
        _count: {
          select: {
            analytics_events: true,
            enquiries: true,
            sms_logs: true,
          },
        },
      },
    }),
  ]);

  return {
    kpis: { totalStores, publishedStores, draftStores, suspendedStores },
    stores: (stores || []).map((s: any) => ({
      id: s.id,
      merchantId: s.merchant_id,
      storeName: s.store_name,
      slug: s.slug,
      publicUrl: getPublicStoreUrl(s.slug),
      publicationStatus: s.publication_status,
      suspensionReason: s.suspension_reason,
      publishedAt: s.published_at,
      updatedAt: s.updated_at,
      merchant: s.merchant,
      counts: {
        products: s.merchant?._count?.products || 0,
        analyticsEvents: s._count?.analytics_events || 0,
        enquiries: s._count?.enquiries || 0,
        smsSent: s._count?.sms_logs || 0,
      },
    })),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    },
  };
}

export async function updateAdminStoreStatus(
  adminId: string,
  storeId: string,
  action: 'SUSPEND' | 'RESTORE',
  reason?: string
) {
  const store = await (prisma as any).merchantStore.findUnique({ where: { id: storeId } });
  if (!store) throw new Error('Store not found');

  const updated = await (prisma as any).merchantStore.update({
    where: { id: store.id },
    data:
      action === 'SUSPEND'
        ? {
            publication_status: 'SUSPENDED',
            suspension_reason: reason?.trim() || 'Suspended by platform administrator',
            suspended_at: new Date(),
            suspended_by: adminId,
          }
        : {
            publication_status: 'PUBLISHED',
            suspension_reason: null,
            suspended_at: null,
            suspended_by: null,
            published_at: store.published_at || new Date(),
          },
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: store.merchant_id,
      admin_id: adminId,
      action: action === 'SUSPEND' ? 'ADMIN_STORE_SUSPENDED' : 'ADMIN_STORE_RESTORED',
      object_type: 'MERCHANT_STORE',
      object_id: store.id,
      metadata: JSON.stringify({ slug: store.slug, reason: reason || null }),
    },
  });

  return updated;
}

export async function updateEnquiryStatus(
  merchantId: string,
  enquiryId: string,
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED'
) {
  const existing = await (prisma as any).storeProductEnquiry.findFirst({
    where: { id: enquiryId, merchant_id: merchantId },
  });
  if (!existing) throw new Error('Enquiry not found');

  return (prisma as any).storeProductEnquiry.update({
    where: { id: existing.id },
    data: { status },
  });
}

export async function listPublicSitemapSlugs() {
  const stores = await (prisma as any).merchantStore.findMany({
    where: {
      publication_status: 'PUBLISHED',
      merchant: { status: { not: 'SUSPENDED' } },
    },
    select: {
      slug: true,
      updated_at: true,
    },
    orderBy: { updated_at: 'desc' },
    take: 500,
  });

  return stores || [];
}
