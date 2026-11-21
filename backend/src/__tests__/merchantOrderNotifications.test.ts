const mockSendSms = jest.fn();

jest.mock('../database/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
    },
    merchant: {
      findUnique: jest.fn(),
    },
    merchantUser: {
      findFirst: jest.fn(),
    },
    merchantNotification: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderNotification: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../notifications/adapter', () => ({
  MesejiSMSAdapter: jest.fn().mockImplementation(() => ({
    sendSMS: (...args: any[]) => mockSendSms(...args),
  })),
  normalizePhone: (p: string) => p?.trim(),
}));

import { prisma } from '../database/prisma';
import {
  buildMerchantNewOrderSms,
  notifyMerchantsForNewOrder,
  markMerchantNotificationRead,
  retryFailedMerchantNotificationSms,
} from '../services/merchantNotificationService';

const pAny = prisma as any;
const flushImmediate = () => new Promise((resolve) => setImmediate(resolve));

describe('Automated Merchant Order Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendSms.mockResolvedValue({ success: true, messageId: 'sms-ok-1' });
    pAny.merchantNotification.update.mockResolvedValue({});
    pAny.orderNotification.update.mockResolvedValue({});
  });

  test('1. Successful order creates dashboard notification & sends SMS to owning merchant', async () => {
    pAny.order.findUnique.mockResolvedValue({
      id: 'ord-1',
      order_number: 'LUMO-9001',
      merchant_id: 'm-1',
      product_name: 'Leather Jacket',
      merchant: {
        id: 'm-1',
        business_name: 'Ado Fashion',
        business_phone: '0768828247',
        store: { store_name: 'Ado Fashion Store' },
      },
      items: [
        {
          product_name_snapshot: 'Leather Jacket',
          quantity: 2,
          product: { id: 'p-1', name: 'Leather Jacket', merchant_id: 'm-1' },
        },
      ],
    });
    pAny.merchantNotification.findUnique.mockResolvedValue(null);
    pAny.merchantNotification.create.mockResolvedValue({ id: 'mn-1' });
    pAny.orderNotification.findUnique.mockResolvedValue(null);
    pAny.orderNotification.create.mockResolvedValue({ id: 'on-1' });

    await notifyMerchantsForNewOrder('ord-1');
    await flushImmediate();

    expect(pAny.merchantNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          merchant_id: 'm-1',
          order_id: 'ord-1',
          idempotency_key: 'NEW_ORDER:ord-1:MERCHANT:m-1',
          action_url: '/dashboard/orders/ord-1',
        }),
      })
    );
    expect(mockSendSms).toHaveBeenCalledTimes(1);
    expect(mockSendSms).toHaveBeenCalledWith(
      '0768828247',
      expect.stringContaining('LUMO-9001')
    );
  });

  test('2. Multiple products from same merchant send ONE summarized notification', async () => {
    pAny.order.findUnique.mockResolvedValue({
      id: 'ord-2',
      order_number: 'LUMO-9002',
      merchant_id: 'm-1',
      product_name: 'Shoes, Socks',
      merchant: {
        id: 'm-1',
        business_name: 'Ado Fashion',
        business_phone: '0768828247',
        store: null,
      },
      items: [
        { product_name_snapshot: 'Sneakers', quantity: 1, product: { id: 'p-1', name: 'Sneakers', merchant_id: 'm-1' } },
        { product_name_snapshot: 'Socks', quantity: 3, product: { id: 'p-2', name: 'Socks', merchant_id: 'm-1' } },
      ],
    });
    pAny.merchantNotification.findUnique.mockResolvedValue(null);
    pAny.merchantNotification.create.mockResolvedValue({ id: 'mn-2' });
    pAny.orderNotification.findUnique.mockResolvedValue(null);
    pAny.orderNotification.create.mockResolvedValue({ id: 'on-2' });

    await notifyMerchantsForNewOrder('ord-2');
    await flushImmediate();

    expect(pAny.merchantNotification.create).toHaveBeenCalledTimes(1);
    expect(mockSendSms).toHaveBeenCalledTimes(1);
    expect(mockSendSms.mock.calls[0][1]).toContain('Sneakers (+1 more)');
    expect(mockSendSms.mock.calls[0][1]).toContain('Qty: 4');
  });

  test('3. Order containing products from multiple merchants notifies each merchant separately', async () => {
    pAny.order.findUnique.mockResolvedValue({
      id: 'ord-3',
      order_number: 'LUMO-9003',
      merchant_id: 'm-1',
      product_name: 'Mixed',
      merchant: { id: 'm-1', business_name: 'Shop A', business_phone: '0711111111', store: null },
      items: [
        { product_name_snapshot: 'Shirt', quantity: 1, product: { id: 'p-1', name: 'Shirt', merchant_id: 'm-1' } },
        { product_name_snapshot: 'Headphones', quantity: 2, product: { id: 'p-2', name: 'Headphones', merchant_id: 'm-2' } },
      ],
    });
    pAny.merchant.findUnique.mockResolvedValue({
      id: 'm-2',
      business_name: 'Tech Hub',
      business_phone: '0722222222',
      store: null,
    });
    pAny.merchantNotification.findUnique.mockResolvedValue(null);
    pAny.merchantNotification.create.mockResolvedValueOnce({ id: 'mn-a' }).mockResolvedValueOnce({ id: 'mn-b' });
    pAny.orderNotification.findUnique.mockResolvedValue(null);
    pAny.orderNotification.create.mockResolvedValue({ id: 'on-x' });

    await notifyMerchantsForNewOrder('ord-3');
    await flushImmediate();

    expect(pAny.merchantNotification.create).toHaveBeenCalledTimes(2);
    expect(mockSendSms).toHaveBeenCalledWith('0711111111', expect.stringContaining('Shirt'));
    expect(mockSendSms).toHaveBeenCalledWith('0722222222', expect.stringContaining('Headphones'));
  });

  test('4. Duplicate prevention skips already-processed order notification & SMS failure allows safe retry', async () => {
    pAny.order.findUnique.mockResolvedValue({
      id: 'ord-dup',
      order_number: 'LUMO-9004',
      merchant_id: 'm-1',
      merchant: { id: 'm-1', business_name: 'Shop A', business_phone: '0711111111', store: null },
      items: [],
    });
    pAny.merchantNotification.findUnique.mockResolvedValue({ id: 'existing-mn' });

    await notifyMerchantsForNewOrder('ord-dup');
    await flushImmediate();
    expect(pAny.merchantNotification.create).not.toHaveBeenCalled();
    expect(mockSendSms).not.toHaveBeenCalled();

    // Retry failed SMS safely without creating duplicate notification
    pAny.merchantNotification.findFirst.mockResolvedValue({
      id: 'mn-fail',
      merchant_id: 'm-1',
      order_id: 'ord-4',
      sms_status: 'FAILED',
      product_summary: 'Watch • Qty 1',
      action_url: '/dashboard/orders/ord-4',
      idempotency_key: 'NEW_ORDER:ord-4:MERCHANT:m-1',
      merchant: { business_name: 'Shop A', business_phone: '0711111111', store: null },
      order: { order_number: 'LUMO-9005', product_name: 'Watch' },
    });
    mockSendSms.mockResolvedValue({ success: true, messageId: 'retry-ok' });

    const retryRes = await retryFailedMerchantNotificationSms('m-1', 'mn-fail');
    expect(retryRes.success).toBe(true);
    expect(pAny.merchantNotification.create).not.toHaveBeenCalled();
  });

  test('5. Security: cross-merchant mark-read and retry are denied', async () => {
    pAny.merchantNotification.findFirst.mockResolvedValue(null);
    await expect(markMerchantNotificationRead('m-attacker', 'mn-victim')).rejects.toThrow(/not found/i);
    await expect(retryFailedMerchantNotificationSms('m-attacker', 'mn-victim')).rejects.toThrow(/not found/i);
  });

  test('6. SMS message template populates merchant, order, product, qty, and dashboard URL cleanly', () => {
    const sms = buildMerchantNewOrderSms({
      merchantName: 'PC Point',
      orderNumber: 'LUMO-12345',
      productSummary: 'HP EliteBook 840',
      totalQuantity: 1,
      dashboardUrl: 'https://lumotrack.lumo.co.tz/dashboard/orders/ord-123',
    });
    expect(sms).toContain('NEW ORDER RECEIVED!');
    expect(sms).toContain('PC Point');
    expect(sms).toContain('#LUMO-12345');
    expect(sms).toContain('HP EliteBook 840');
    expect(sms).toContain('Qty: 1');
    expect(sms).toContain('https://lumotrack.lumo.co.tz/dashboard/orders/ord-123');
  });
});
