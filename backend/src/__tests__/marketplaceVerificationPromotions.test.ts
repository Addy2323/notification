const mockCreateSession = jest.fn();
const mockGetSessionStatus = jest.fn();
const mockSendSms = jest.fn();
const mockGetMerchantOverview = jest.fn();
const mockDeductCredits = jest.fn();
const mockExtendMerchantCredits = jest.fn();

jest.mock('../database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    merchantCategory: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    merchantCategoryMapping: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    merchant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    merchantStore: {
      findUnique: jest.fn(),
    },
    merchantFollower: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    merchantPost: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    storeCategory: {
      findMany: jest.fn(),
    },
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    verificationPlan: {
      count: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    verificationApplication: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    smsGlobalSetting: {
      findUnique: jest.fn(),
    },
    smsTemplate: {
      count: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    smsCampaign: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    smsCampaignRecipient: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../services/snippePaymentService', () => ({
  snippePaymentService: {
    createSession: (...args: any[]) => mockCreateSession(...args),
    getSessionStatus: (...args: any[]) => mockGetSessionStatus(...args),
    pushPayment: jest.fn(),
    verifyWebhookSignature: jest.fn().mockReturnValue({ valid: true }),
  },
}));

jest.mock('../notifications/adapter', () => ({
  MesejiSMSAdapter: jest.fn().mockImplementation(() => ({
    sendSMS: (...args: any[]) => mockSendSms(...args),
  })),
  normalizePhone: (p: string) => p?.trim(),
}));

jest.mock('../services/smsManagementService', () => ({
  smsManagementService: {
    getMerchantOverview: (...args: any[]) => mockGetMerchantOverview(...args),
    deductCredits: (...args: any[]) => mockDeductCredits(...args),
    extendMerchantCredits: (...args: any[]) => mockExtendMerchantCredits(...args),
  },
}));

import { prisma } from '../database/prisma';
import {
  listPublicMerchants,
  getPublicMerchantProfile,
  toggleFollowMerchant,
} from '../services/marketplaceService';
import {
  initiateVerificationPayment,
  confirmVerificationPaymentIdempotent,
  approveVerificationApplication,
  expireElapsedVerifications,
} from '../services/verificationService';
import {
  previewSmsCampaign,
  createAndSendSmsCampaign,
  getMerchantCampaignDetails,
} from '../services/promotionService';

const pAny = prisma as any;

describe('LUMO Marketplace, Verified Merchants & Bulk SMS Promotions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pAny.$transaction.mockImplementation(async (fn: any) => fn(pAny));
    pAny.merchantCategory.count.mockResolvedValue(12);
    pAny.verificationPlan.count.mockResolvedValue(3);
    pAny.smsTemplate.count.mockResolvedValue(5);
    mockSendSms.mockResolvedValue({ success: true, messageId: 'msg-1' });
  });

  test('1. Marketplace directory returns real engagement stats & verified badge status', async () => {
    pAny.merchant.findMany.mockResolvedValue([
      {
        id: 'm-1',
        business_name: 'Ado Fashion',
        is_verified: true,
        verification_status: 'VERIFIED',
        verification_expires_at: new Date(Date.now() + 86400000),
        location: 'Dar es Salaam',
        created_at: new Date(),
        store: {
          slug: 'ado-fashion',
          store_name: 'Ado Fashion',
          description: 'Quality outfits',
          publication_status: 'PUBLISHED',
        },
        category_mappings: [
          { is_primary: true, category: { id: 'cat-1', name: 'Fashion & Clothing', slug: 'fashion-clothing' } },
        ],
        _count: { followers: 14, products: 9, customers: 42, posts: 3 },
      },
      {
        id: 'm-2',
        business_name: 'Unverified Shop',
        is_verified: false,
        verification_status: 'NOT_VERIFIED',
        created_at: new Date(),
        store: {
          slug: 'unverified-shop',
          store_name: 'Unverified Shop',
          publication_status: 'PUBLISHED',
        },
        category_mappings: [],
        _count: { followers: 2, products: 3, customers: 1, posts: 0 },
      },
    ]);

    const res = await listPublicMerchants({ sort: 'popularity' });
    expect(res.total).toBe(2);
    expect(res.items[0].isVerified).toBe(true);
    expect(res.items[0].stats.followersCount).toBe(56);
    expect(res.items[0].stats.productsCount).toBe(9);
    expect(res.items[1].isVerified).toBe(false);
  });

  test('2. Public merchant profile syncs published products without exposing cost_price and supports follow toggle', async () => {
    pAny.merchantStore.findUnique.mockResolvedValue({
      id: 'store-1',
      merchant_id: 'm-1',
      slug: 'ado-fashion',
      store_name: 'Ado Fashion',
      publication_status: 'PUBLISHED',
      show_sold_out_badges: true,
      merchant: {
        id: 'm-1',
        business_name: 'Ado Fashion',
        status: 'ACTIVE',
        is_verified: true,
        verification_status: 'VERIFIED',
        verification_expires_at: null,
      },
    });
    pAny.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Silk Dress',
        unit_price: 45000,
        cost_price: 20000,
        currency: 'TZS',
        status: 'ACTIVE',
        publication_status: 'PUBLISHED',
        stock_status: 'IN_STOCK',
        images_json: '[]',
        variants_json: '[]',
      },
    ]);
    pAny.storeCategory.findMany.mockResolvedValue([]);
    pAny.merchantCategoryMapping.findMany.mockResolvedValue([]);
    pAny.merchantPost.findMany.mockResolvedValue([]);
    pAny.merchantFollower.count.mockResolvedValue(5);
    pAny.customer.count.mockResolvedValue(12);
    pAny.merchantFollower.findUnique.mockResolvedValue(null);

    const profile = await getPublicMerchantProfile('ado-fashion', 'user:u-1');
    expect(profile).not.toBeNull();
    expect(profile?.merchant.isVerified).toBe(true);
    expect(profile?.products).toHaveLength(1);
    expect((profile?.products[0] as any).costPrice).toBeUndefined();
    expect((profile?.products[0] as any).cost_price).toBeUndefined();

    pAny.merchantFollower.create.mockResolvedValue({ id: 'f-1' });
    pAny.merchantFollower.count.mockResolvedValue(6);
    const followRes = await toggleFollowMerchant('ado-fashion', 'user:u-1', 'u-1', 'Amina');
    expect(followRes).toEqual({ following: true, followersCount: 18 });
  });

  test('3. Verification payment uses Snippe, requires Admin approval, and expires elapsed subscriptions', async () => {
    pAny.merchant.findUnique.mockResolvedValue({
      id: 'm-1',
      business_name: 'Ado Fashion',
      business_phone: '0768828247',
      is_verified: false,
      verification_status: 'NOT_VERIFIED',
    });
    pAny.verificationPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      name: 'Monthly Verification',
      duration_days: 30,
      price_tzs: 15000,
      is_active: true,
    });
    mockCreateSession.mockResolvedValue({
      reference: 'snippe-sess-1',
      checkout_url: 'https://snippe.me/checkout/1',
      payment_link_url: 'https://snippe.me/p/1',
    });
    pAny.verificationApplication.create.mockResolvedValue({
      id: 'app-1',
      transaction_reference: 'VER_123',
      status: 'PAYMENT_PENDING',
      payment_status: 'PENDING',
    });

    const app = await initiateVerificationPayment('m-1', 'u-1', 'plan-1', '0768828247');
    expect(app.status).toBe('PAYMENT_PENDING');
    expect(mockCreateSession).toHaveBeenCalledTimes(1);

    // Webhook payment confirmation sets PAID_PENDING_REVIEW (never auto-grants VERIFIED)
    pAny.verificationApplication.findFirst.mockResolvedValue({
      id: 'app-1',
      merchant_id: 'm-1',
      transaction_reference: 'VER_123',
      payment_status: 'PENDING',
      payment_amount_tzs: 15000,
      merchant: { business_name: 'Ado Fashion', is_verified: false },
      plan: { name: 'Monthly Verification' },
    });
    pAny.verificationApplication.findUnique.mockResolvedValue({ id: 'app-1', payment_status: 'PENDING' });
    pAny.verificationApplication.update.mockResolvedValue({
      id: 'app-1',
      payment_status: 'SUCCESSFUL',
      status: 'PAID_PENDING_REVIEW',
    });
    pAny.smsGlobalSetting.findUnique.mockResolvedValue({ admin_alert_phones: '["0768828247"]' });

    const confirmed = await confirmVerificationPaymentIdempotent('VER_123', 'gw-1');
    expect(confirmed.status).toBe('PAID_PENDING_REVIEW');
    expect(mockSendSms).toHaveBeenCalledWith(
      '0768828247',
      expect.stringContaining('LUMO Track: A merchant has successfully paid for Verified Merchant subscription')
    );

    // Admin approval activates VERIFIED badge
    pAny.verificationApplication.findUnique.mockResolvedValue({
      id: 'app-1',
      merchant_id: 'm-1',
      method: 'PAID',
      payment_status: 'SUCCESSFUL',
      plan: { duration_days: 30 },
      merchant: { business_name: 'Ado Fashion', business_phone: '0768828247', is_verified: false },
    });
    pAny.verificationApplication.update.mockResolvedValue({ id: 'app-1', status: 'VERIFIED' });

    const approved = await approveVerificationApplication('admin-1', 'app-1');
    expect(approved.status).toBe('VERIFIED');
    expect(pAny.merchant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm-1' },
        data: expect.objectContaining({ is_verified: true, verification_status: 'VERIFIED' }),
      })
    );

    // Expiration sweep removes expired badge
    pAny.merchant.findMany.mockResolvedValue([{ id: 'm-expired' }]);
    const expiredCount = await expireElapsedVerifications();
    expect(expiredCount).toBe(1);
    expect(pAny.merchant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { is_verified: false, verification_status: 'EXPIRED' },
      })
    );
  });

  test('4. Bulk SMS promotions enforce merchant-customer ownership and never auto-send on details view', async () => {
    pAny.merchant.findUnique.mockResolvedValue({ id: 'm-1', business_name: 'Ado Fashion' });
    pAny.merchantStore.findUnique.mockResolvedValue({ slug: 'ado-fashion', store_name: 'Ado Fashion' });
    mockGetMerchantOverview.mockResolvedValue({
      account: { availableCredits: 100 },
      pricing: { unitPriceTzs: 20 },
    });

    // Cross-merchant recipient rejected
    pAny.customer.findMany.mockResolvedValue([{ id: 'c-1', merchant_id: 'm-1', name: 'Amina', phone: '0711111111', marketing_opt_in: true }]);
    await expect(
      previewSmsCampaign('m-1', {
        name: 'Promo',
        promotionType: 'NEW_ARRIVALS',
        messageBody: 'Hi [Customer Name]',
        customerIds: ['c-1', 'c-belongs-to-other-merchant'],
      })
    ).rejects.toThrow(/do not belong to your merchant/i);

    // Valid preview + draft creation
    const preview = await previewSmsCampaign('m-1', {
      name: 'Flash Sale',
      promotionType: 'DISCOUNT_OFFERS',
      messageBody: 'Hello [Customer Name], shop at [Store Link]',
      customerIds: ['c-1'],
    });
    expect(preview.totalEligibleRecipients).toBe(1);
    expect(preview.estimatedCostTzs).toBe(20);
    expect(preview.hasSufficientCredits).toBe(true);

    pAny.smsCampaign.create.mockResolvedValue({ id: 'camp-1', status: 'DRAFT' });
    const draft = await createAndSendSmsCampaign('m-1', 'u-1', {
      name: 'Flash Sale',
      promotionType: 'DISCOUNT_OFFERS',
      messageBody: 'Hello [Customer Name]',
      customerIds: ['c-1'],
      confirmSend: false,
    });
    expect(draft.status).toBe('DRAFT');
    expect(mockSendSms).not.toHaveBeenCalled();

    // Opening campaign details never triggers SMS sending
    pAny.smsCampaign.findFirst.mockResolvedValue({
      id: 'camp-1',
      merchant_id: 'm-1',
      name: 'Flash Sale',
      status: 'COMPLETED',
      recipients: [],
    });
    const details = await getMerchantCampaignDetails('m-1', 'camp-1');
    expect(details.id).toBe('camp-1');
    expect(mockSendSms).not.toHaveBeenCalled();
  });
});

