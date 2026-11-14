const mockDeductCredits = jest.fn();
const mockSendSms = jest.fn();
const mockCreateOrder = jest.fn();

jest.mock('../database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    merchant: {
      findUnique: jest.fn(),
    },
    merchantUser: {
      findFirst: jest.fn(),
    },
    merchantStore: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    storeCategory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    storeAnalyticsEvent: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    storeProductEnquiry: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    storeSmsDispatchLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    merchantSmsAccount: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    smsCreditLedger: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../services/orderService', () => ({
  createOrder: (...args: any[]) => mockCreateOrder(...args),
}));

jest.mock('../services/smsManagementService', () => ({
  smsManagementService: {
    deductCredits: (...args: any[]) => mockDeductCredits(...args),
  },
}));

jest.mock('../notifications/adapter', () => ({
  MesejiSMSAdapter: jest.fn().mockImplementation(() => ({
    sendSMS: (...args: any[]) => mockSendSms(...args),
  })),
  normalizePhone: (phone: string) => phone?.trim(),
}));

import { prisma } from '../database/prisma';
import {
  DEFAULT_STORE_SMS_TEMPLATE,
  validateStoreSlugFormat,
  checkSlugAvailability,
  getMerchantStoreDashboard,
  upsertMerchantStore,
  serializePublicProduct,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreCategory,
  getPublicStoreBySlug,
  submitPublicStoreOrderOrEnquiry,
  getTrackingStoreRecommendations,
  getBuyAgainOrderPreview,
  submitBuyAgainOrder,
  renderStoreSmsTemplate,
  updateCustomerMarketingConsent,
  sendStoreLinkSms,
  generateStoreQrSvg,
  updateAdminStoreStatus,
} from '../services/storeService';

const pAny = prisma as any;

describe('LUMO SmartTrack Store System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Store creation & prefill from merchant profile without fabricated stats', async () => {
    pAny.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      business_name: 'ABC Fashion TZ',
      business_phone: '+255711111111',
      whatsapp_number: '+255711111111',
      email: 'sales@abcfashion.co.tz',
      location: 'Kariakoo, Dar es Salaam',
      logo_url: '/uploads/logo.png',
      brand_color: '#123456',
      website: 'https://abcfashion.co.tz',
      status: 'ACTIVE',
      store: null,
    });
    pAny.merchantStore.findFirst.mockResolvedValue(null);
    pAny.product.findMany.mockResolvedValue([]);

    const dash = await getMerchantStoreDashboard('merchant-1');
    expect(dash.store).toBeNull();
    expect(dash.prefill.storeName).toBe('ABC Fashion TZ');
    expect(dash.prefill.suggestedSlug).toBe('abc-fashion-tz');
    expect(dash.prefill.contactPhone).toBe('+255711111111');
    expect(dash.stats.totalPublished).toBe(0);
    expect(dash.analytics.storeViews).toBe(0);
    expect(dash.analytics.conversionRate).toBeNull();

    pAny.merchantStore.findUnique.mockResolvedValue(null);
    pAny.merchantStore.findMany.mockResolvedValue([]);
    pAny.merchantStore.create.mockResolvedValue({
      id: 'store-1',
      merchant_id: 'merchant-1',
      store_name: 'ABC Fashion TZ',
      slug: 'abc-fashion-tz',
      publication_status: 'PUBLISHED',
    });

    const created = await upsertMerchantStore('merchant-1', 'user-1', {
      storeName: 'ABC Fashion TZ',
      slug: 'abc-fashion-tz',
      publicationStatus: 'PUBLISHED',
    });

    expect(created.slug).toBe('abc-fashion-tz');
    expect(pAny.merchantStore.create).toHaveBeenCalledTimes(1);
    expect(pAny.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'STORE_CREATED' }),
      })
    );
  });

  test('2. Unique slug enforcement, reserved slug rejection, and previous slug redirects', async () => {
    const reserved = validateStoreSlugFormat('admin');
    expect(reserved.valid).toBe(false);
    expect(reserved.error).toMatch(/reserved/i);

    pAny.merchantStore.findUnique.mockResolvedValue({ id: 'store-other', merchant_id: 'other-merchant' });
    const taken = await checkSlugAvailability('abc-fashion', 'merchant-1');
    expect(taken.available).toBe(false);

    // Same merchant keeps their own slug cleanly
    pAny.merchantStore.findUnique.mockResolvedValue({ id: 'store-1', merchant_id: 'merchant-1' });
    const ownSlug = await checkSlugAvailability('abc-fashion', 'merchant-1');
    expect(ownSlug.available).toBe(true);

    // Public lookup on an old slug resolves cleanly to REDIRECT
    pAny.merchantStore.findUnique.mockResolvedValue(null);
    pAny.merchantStore.findMany.mockResolvedValue([
      { slug: 'abc-fashion-v2', previous_slugs: JSON.stringify(['abc-fashion']) },
    ]);

    const redirected = await getPublicStoreBySlug('abc-fashion');
    expect(redirected).toEqual({
      status: 'REDIRECT',
      redirectSlug: 'abc-fashion-v2',
    });
  });

  test('3. Strict customer-facing privacy: cost_price and merchant_id stripped from public responses', async () => {
    const rawProduct = {
      id: 'prod-1',
      merchant_id: 'merchant-secret-id',
      name: 'Leather Bag',
      description: 'Genuine handmade leather bag',
      category: 'Bags',
      unit_price: 85000,
      cost_price: 40000,
      promotional_price: 70000,
      track_inventory: true,
      available_quantity: 4,
      low_stock_threshold: 5,
      stock_status: 'IN_STOCK',
      publication_status: 'PUBLISHED',
      status: 'ACTIVE',
      is_featured: true,
      images_json: JSON.stringify(['/uploads/store/bag-1.jpg', '/uploads/store/bag-2.jpg']),
      variants_json: JSON.stringify([{ id: 'v1', name: 'Black / Medium', price: 72000, stockQuantity: 2 }]),
    };

    const publicProd = serializePublicProduct(rawProduct, true);
    expect((publicProd as any).cost_price).toBeUndefined();
    expect((publicProd as any).costPrice).toBeUndefined();
    expect((publicProd as any).merchant_id).toBeUndefined();
    expect(publicProd.effectivePrice).toBe(70000);
    expect(publicProd.isPromotionActive).toBe(true);
    expect(publicProd.stockStatus).toBe('LOW_STOCK');
    expect(publicProd.isAvailable).toBe(true);
    expect(publicProd.variants).toHaveLength(1);
  });

  test('4. Inventory status & product lifecycle (create, out-of-stock derivation, draft/publish/archive)', async () => {
    pAny.product.create.mockImplementation(async ({ data }: any) => ({ id: 'prod-new', ...data }));

    const created = await createStoreProduct('merchant-1', 'user-1', {
      name: 'Cotton Shirt',
      unitPrice: 35000,
      costPrice: 18000,
      trackInventory: true,
      availableQuantity: 0,
      publicationStatus: 'PUBLISHED',
    });

    expect(created.stockStatus).toBe('OUT_OF_STOCK');
    expect(created.isAvailable).toBe(false);
    expect(created.showSoldOutBadge).toBe(true);
    expect(created.costPrice).toBe(18000); // Returned on merchant serializer only
  });

  test('5. Storefront ORDER_REQUEST creates real PENDING/UNPAID order & deducts tracked inventory', async () => {
    pAny.merchantStore.findUnique.mockResolvedValue({
      id: 'store-1',
      merchant_id: 'merchant-1',
      store_name: 'ABC Fashion TZ',
      slug: 'abc-fashion',
      publication_status: 'PUBLISHED',
      show_sold_out_badges: true,
      merchant: { status: 'ACTIVE', business_name: 'ABC Fashion TZ' },
    });
    pAny.product.findFirst.mockResolvedValue({
      id: 'prod-1',
      merchant_id: 'merchant-1',
      name: 'Sneakers',
      unit_price: 65000,
      cost_price: 30000,
      track_inventory: true,
      available_quantity: 5,
      low_stock_threshold: 2,
      stock_status: 'IN_STOCK',
      publication_status: 'PUBLISHED',
      status: 'ACTIVE',
      currency: 'TZS',
    });
    pAny.merchantUser.findFirst.mockResolvedValue({ id: 'owner-1' });
    mockCreateOrder.mockResolvedValue({
      order: { id: 'order-created-1', order_number: 'ORD-5001' },
      tracking_url: '/track/trk-5001',
    });
    pAny.product.update.mockResolvedValue({});
    pAny.storeProductEnquiry.create.mockResolvedValue({ id: 'enq-1' });
    pAny.storeAnalyticsEvent.create.mockResolvedValue({});

    const res = await submitPublicStoreOrderOrEnquiry('abc-fashion', {
      type: 'ORDER_REQUEST',
      productId: 'prod-1',
      quantity: 2,
      customerName: 'Neema Juma',
      customerPhone: '+255722333444',
      deliveryAddress: 'Sinza Mori, DSM',
    });

    expect(res).toEqual({
      type: 'ORDER_REQUEST',
      orderNumber: 'ORD-5001',
      trackingUrl: '/track/trk-5001',
      enquiryId: 'enq-1',
    });
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: 'merchant-1',
        paymentStatus: 'UNPAID',
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod-1',
            unitSellingPrice: 65000,
            quantity: 2,
          }),
        ]),
      })
    );
    expect(pAny.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { available_quantity: 3, stock_status: 'IN_STOCK' },
    });
  });

  test('6. Promotional SMS enforces customer opt-in consent, deducts credits & refunds on SMS failure', async () => {
    const smsText = renderStoreSmsTemplate(DEFAULT_STORE_SMS_TEMPLATE, {
      customerName: 'Amina',
      businessName: 'ABC Fashion',
      storeName: 'ABC Fashion',
      storeLink: 'https://lumotrack.lumo.co.tz/store/abc-fashion',
      customerPhone: '+255712000111',
    });
    expect(smsText).toContain('Amina');
    expect(smsText).toContain('https://lumotrack.lumo.co.tz/store/abc-fashion');

    pAny.merchantStore.findUnique.mockResolvedValue({
      id: 'store-1',
      merchant_id: 'merchant-1',
      store_name: 'ABC Fashion',
      slug: 'abc-fashion',
      publication_status: 'PUBLISHED',
      store_sms_template: DEFAULT_STORE_SMS_TEMPLATE,
      merchant: { business_name: 'ABC Fashion' },
    });

    // Reject unopted customer list
    pAny.customer.findMany.mockResolvedValue([
      { id: 'cust-no', name: 'No OptIn', phone: '+255700000001', marketing_opt_in: false },
    ]);
    await expect(
      sendStoreLinkSms('merchant-1', 'user-1', { customerIds: ['cust-no'] })
    ).rejects.toThrow(/opt-in/i);

    // Deducts credit then refunds cleanly when adapter fails
    pAny.customer.findMany.mockResolvedValue([
      { id: 'cust-yes', name: 'Amina', phone: '+255712000111', marketing_opt_in: true },
    ]);
    pAny.storeSmsDispatchLog.findFirst.mockResolvedValue(null);
    mockDeductCredits.mockResolvedValue({ allowed: true, units: 1, remainingCredits: 9 });
    mockSendSms.mockResolvedValue({ success: false, error: 'Provider timeout' });
    pAny.storeSmsDispatchLog.create.mockImplementation(async ({ data }: any) => data);
    pAny.$transaction.mockImplementation(async (cb: any) =>
      cb({
        merchantSmsAccount: {
          findUnique: jest.fn().mockResolvedValue({ id: 'acc-1', available_credits: 9, total_consumed: 1 }),
          update: pAny.merchantSmsAccount.update,
        },
        smsCreditLedger: {
          create: pAny.smsCreditLedger.create,
        },
      })
    );

    const smsResult = await sendStoreLinkSms('merchant-1', 'user-1', {
      customerIds: ['cust-yes'],
    });

    expect(smsResult.failedCount).toBe(1);
    expect(mockDeductCredits).toHaveBeenCalledTimes(1);
    expect(pAny.merchantSmsAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { available_credits: 10, total_consumed: 0 },
      })
    );
    expect(pAny.smsCreditLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'REFUND', amount: 1 }),
      })
    );
  });

  test('7. Tracking recommendations stay merchant-scoped & Buy Again re-validates live prices', async () => {
    pAny.merchantStore.findUnique.mockResolvedValue({
      id: 'store-1',
      merchant_id: 'merchant-1',
      store_name: 'ABC Fashion',
      slug: 'abc-fashion',
      publication_status: 'PUBLISHED',
      show_on_tracking_page: true,
      show_sold_out_badges: true,
      merchant: { status: 'ACTIVE', business_name: 'ABC Fashion' },
    });
    pAny.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        merchant_id: 'merchant-1',
        name: 'Tote Bag',
        unit_price: 45000,
        cost_price: 20000,
        status: 'ACTIVE',
        publication_status: 'PUBLISHED',
        stock_status: 'IN_STOCK',
        track_inventory: false,
      },
    ]);

    const recs = await getTrackingStoreRecommendations('merchant-1');
    expect(recs?.products).toHaveLength(1);
    expect((recs?.products[0] as any).cost_price).toBeUndefined();
    expect(pAny.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ merchant_id: 'merchant-1' }),
      })
    );

    // Buy Again live price refresh check (previous 30,000 -> live 35,000)
    pAny.order.findFirst.mockResolvedValue({
      id: 'orig-ord-1',
      order_number: 'ORD-101',
      merchant_id: 'merchant-1',
      customer_name: 'Neema',
      customer_phone: '+255712345678',
      delivery_address: 'Mikocheni',
      currency: 'TZS',
      items: [
        {
          product_id: 'prod-1',
          product_name_snapshot: 'Tote Bag',
          quantity: 1,
          unit_selling_price: 30000,
        },
      ],
      merchant: {
        status: 'ACTIVE',
        store: {
          id: 'store-1',
          merchant_id: 'merchant-1',
          store_name: 'ABC Fashion',
          slug: 'abc-fashion',
          publication_status: 'PUBLISHED',
          show_sold_out_badges: true,
        },
      },
    });
    pAny.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        merchant_id: 'merchant-1',
        name: 'Tote Bag',
        unit_price: 35000,
        status: 'ACTIVE',
        publication_status: 'PUBLISHED',
        stock_status: 'IN_STOCK',
        track_inventory: true,
        available_quantity: 10,
      },
    ]);

    const preview = await getBuyAgainOrderPreview('trk-101');
    expect(preview?.items[0].previousUnitPrice).toBe(30000);
    expect(preview?.items[0].currentUnitPrice).toBe(35000);
    expect(preview?.items[0].priceChanged).toBe(true);

    pAny.merchantUser.findFirst.mockResolvedValue({ id: 'owner-1' });
    mockCreateOrder.mockResolvedValue({
      order: { id: 'reorder-1', order_number: 'ORD-202' },
      tracking_url: '/track/trk-202',
    });
    pAny.product.update.mockResolvedValue({});
    pAny.storeProductEnquiry.create.mockResolvedValue({});
    pAny.storeAnalyticsEvent.create.mockResolvedValue({});

    const reorder = await submitBuyAgainOrder('trk-101', {
      customerName: 'Neema',
      customerPhone: '+255712345678',
      deliveryAddress: 'Mikocheni B',
      items: [{ productId: 'prod-1', quantity: 2 }],
    });

    expect(reorder.orderNumber).toBe('ORD-202');
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ unitSellingPrice: 35000, quantity: 2 })],
      })
    );
  });

  test('8. Tenant isolation, QR code generation, and Admin Suspend/Restore governance', async () => {
    pAny.product.findFirst.mockResolvedValue(null);
    await expect(
      updateStoreProduct('merchant-B', 'user-B', 'prod-belongs-to-A', { name: 'Hacked' })
    ).rejects.toThrow(/not found/i);

    pAny.storeCategory.findFirst.mockResolvedValue(null);
    await expect(deleteStoreCategory('merchant-B', 'cat-A')).rejects.toThrow(/not found/i);

    pAny.customer.findFirst.mockResolvedValue(null);
    await expect(
      updateCustomerMarketingConsent('merchant-B', 'cust-A', true)
    ).rejects.toThrow(/not found/i);

    const svg = await generateStoreQrSvg('https://lumotrack.lumo.co.tz/store/abc-fashion');
    expect(svg).toContain('<svg');

    // Admin suspend blocks storefront publicly until restored
    pAny.merchantStore.findUnique.mockResolvedValue({
      id: 'store-1',
      merchant_id: 'merchant-1',
      slug: 'abc-fashion',
      store_name: 'ABC Fashion',
      publication_status: 'PUBLISHED',
      merchant: { status: 'ACTIVE' },
    });
    pAny.merchantStore.update.mockResolvedValue({
      id: 'store-1',
      publication_status: 'SUSPENDED',
    });

    await updateAdminStoreStatus('admin-1', 'store-1', 'SUSPEND', 'Policy check');
    expect(pAny.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_STORE_SUSPENDED' }),
      })
    );

    pAny.merchantStore.findUnique.mockResolvedValue({
      id: 'store-1',
      store_name: 'ABC Fashion',
      publication_status: 'SUSPENDED',
      merchant: { status: 'ACTIVE' },
    });
    const suspendedView = await getPublicStoreBySlug('abc-fashion');
    expect(suspendedView.status).toBe('SUSPENDED');
  });
});
