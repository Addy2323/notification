import fs from 'fs';

const mockDeductCredits = jest.fn();
const mockSendSms = jest.fn();

jest.mock('../database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    confirmationReceipt: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderNotification: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderReceiptConfirmation: {
      updateMany: jest.fn(),
    },
    orderEvent: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    driver: {
      update: jest.fn(),
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

jest.mock('../services/smsManagementService', () => ({
  smsManagementService: {
    deductCredits: (...args: any[]) => mockDeductCredits(...args),
  },
}));

jest.mock('../notifications/adapter', () => ({
  MesejiSMSAdapter: jest.fn().mockImplementation(() => ({
    sendSMS: (...args: any[]) => mockSendSms(...args),
  })),
  normalizePhone: (phone: string) => phone,
}));

jest.mock('../notifications/orderNotificationEngine', () => ({
  dispatchOrderEvent: jest.fn(),
}));

jest.mock('../services/receiptConfirmationService', () => {
  const actual = jest.requireActual('../services/receiptConfirmationService');
  return {
    ...actual,
    triggerOrderReceiptConfirmation: jest.fn().mockResolvedValue(null),
  };
});

import { prisma } from '../database/prisma';
import {
  buildConfirmationReceiptSmsMessage,
  normalizePaymentStatus,
  reconcileOrderFinancials,
  triggerConfirmationReceipt,
  dispatchConfirmationReceiptSms,
  resendConfirmationReceiptSms,
  getPublicReceiptByToken,
  hashReceiptToken,
} from '../services/confirmationReceiptService';
import { generateConfirmationReceiptPdf } from '../services/receiptPdfService';
import { handleSmsDeliveryWebhook } from '../services/receiptConfirmationService';
import { updateOrderStatus } from '../services/orderService';

const createdPdfPaths: string[] = [];

function makeBaseOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'ord-1',
    order_number: 'LUMO-90012',
    merchant_id: 'merch-1',
    customer_id: 'cust-1',
    customer_name: 'Asha Juma',
    customer_phone: '+255712345678',
    delivery_address: 'Mikocheni B, Dar es Salaam',
    product_name: 'Wireless Barcode Scanner',
    amount: 120000,
    total_revenue: 120000,
    delivery_fee: 5000,
    discount_amount: 0,
    tax_amount: 0,
    amount_paid: 0,
    currency: 'TZS',
    payment_status: 'UNPAID',
    transaction_reference: null,
    status: 'COMPLETED',
    completed_at: new Date('2026-11-14T10:00:00Z'),
    delivered_at: null,
    tracking_token: 'trk-123',
    driver_token: null,
    driver_id: null,
    driver_name: null,
    driver_phone: null,
    vehicle_info: 'BODA',
    merchant: {
      id: 'merch-1',
      business_name: 'Kariakoo Tech Hub',
      logo_url: null,
      brand_color: '#0F172A',
      location: 'Kariakoo Street, Dar es Salaam',
      business_phone: '+255755000111',
      email: 'sales@kariakootech.co.tz',
      website: 'https://kariakootech.co.tz',
    },
    customer: { id: 'cust-1', name: 'Asha Juma', phone: '+255712345678' },
    items: [
      {
        product_name_snapshot: 'Wireless Barcode Scanner',
        product_description_snapshot: '2D USB + Bluetooth scanner',
        quantity: 2,
        unit_selling_price: 60000,
        discount: 0,
        subtotal: 120000,
      },
    ],
    confirmation_receipt: null,
    ...overrides,
  };
}

describe('Automated Confirmation Receipt System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeductCredits.mockResolvedValue({ allowed: true, units: 1, remainingCredits: 50 });
    mockSendSms.mockResolvedValue({ success: true, messageId: 'msg-123' });
    (prisma.orderNotification.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.orderNotification.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });
    (prisma.orderNotification.update as jest.Mock).mockResolvedValue({ id: 'notif-1' });
    (prisma.orderNotification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.orderReceiptConfirmation.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.orderEvent.create as jest.Mock).mockResolvedValue({ id: 'evt-1' });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });
  });

  afterAll(() => {
    for (const p of createdPdfPaths) {
      try {
        if (p && fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it('builds the exact approved customer SMS message wording', () => {
    const msg = buildConfirmationReceiptSmsMessage({
      customerName: 'Asha Juma',
      orderNumber: '#LUMO-90012',
      receiptLink: 'https://lumotrack.lumo.co.tz/receipt/abc123',
      businessName: 'Kariakoo Tech Hub',
    });

    expect(msg).toBe(
      'Hello Asha Juma, your order #LUMO-90012 has been successfully completed. Your confirmation receipt is ready!\n\n' +
        'View or download your receipt here:\n' +
        'https://lumotrack.lumo.co.tz/receipt/abc123\n\n' +
        'Thank you for shopping with Kariakoo Tech Hub.'
    );
    expect(msg).toContain('Your confirmation receipt is ready!');
  });

  it('only generates confirmation receipts for COMPLETED or DELIVERED orders', async () => {
    for (const status of ['PENDING', 'CONFIRMED', 'CANCELLED']) {
      (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(makeBaseOrder({ status }));
      const res = await triggerConfirmationReceipt('ord-1', { syncSms: true });
      expect(res).toBeNull();
      expect((prisma as any).confirmationReceipt.create).not.toHaveBeenCalled();
    }
  });

  it('prevents duplicate receipts and duplicate automatic SMS on repeated completion triggers', async () => {
    const existingReceipt = {
      id: 'rcpt-1',
      receipt_number: 'RCP-20261114-AA11BB',
      status: 'GENERATED',
      sms_status: 'SMS_SENT',
      public_token: 'a'.repeat(64),
    };

    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(
      makeBaseOrder({ status: 'COMPLETED', confirmation_receipt: existingReceipt })
    );

    const res = await triggerConfirmationReceipt('ord-1', { syncSms: true });
    expect(res).toEqual(existingReceipt);
    expect((prisma as any).confirmationReceipt.create).not.toHaveBeenCalled();
    expect(mockSendSms).not.toHaveBeenCalled();

    (prisma.order.findFirst as jest.Mock).mockResolvedValueOnce(
      makeBaseOrder({ status: 'COMPLETED', confirmation_receipt: existingReceipt })
    );
    const repeatStatusRes = await updateOrderStatus('merch-1', 'user-1', 'ord-1', 'COMPLETED');
    expect(repeatStatusRes.confirmation_receipt?.receipt_number).toBe('RCP-20261114-AA11BB');
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it('keeps payment status strictly independent of order completion', () => {
    expect(normalizePaymentStatus('UNPAID', 0, 125000)).toBe('UNPAID');
    expect(normalizePaymentStatus('PARTIALLY_PAID', 50000, 125000)).toBe('PARTIALLY PAID');
    expect(normalizePaymentStatus('PAID', 125000, 125000)).toBe('PAID');
    expect(normalizePaymentStatus('REFUNDED', 125000, 125000)).toBe('REFUNDED');

    const completedUnpaid = reconcileOrderFinancials(
      makeBaseOrder({ status: 'COMPLETED', payment_status: 'UNPAID', amount_paid: 0 })
    );
    expect(completedUnpaid.paymentStatus).toBe('UNPAID');
    expect(completedUnpaid.grandTotal).toBe(125000);
    expect(completedUnpaid.outstandingBalance).toBe(125000);

    const partial = reconcileOrderFinancials(
      makeBaseOrder({
        status: 'COMPLETED',
        payment_status: 'PARTIALLY_PAID',
        amount_paid: 45000,
        delivery_fee: 5000,
        discount_amount: 10000,
        tax_amount: 5000,
      })
    );
    expect(partial.paymentStatus).toBe('PARTIALLY PAID');
    expect(partial.grandTotal).toBe(120000);
    expect(partial.outstandingBalance).toBe(75000);
  });

  it('generates a valid multi-page PDF document for large orders without clipping', async () => {
    const manyItems = Array.from({ length: 38 }, (_, i) => ({
      productName: `Product Item #${i + 1} — Extended Commercial Description for Pagination Verification`,
      description: 'Batch verified inventory line',
      quantity: (i % 4) + 1,
      unitPrice: 15000,
      discount: 0,
      lineTotal: ((i % 4) + 1) * 15000,
    }));

    const subtotal = manyItems.reduce((acc, it) => acc + it.lineTotal, 0);
    const pdf = await generateConfirmationReceiptPdf({
      receiptNumber: 'RCP-20261114-PDF001',
      orderNumber: 'LUMO-90012',
      receiptGeneratedAt: new Date('2026-11-14T10:05:00Z'),
      orderCompletedAt: new Date('2026-11-14T10:00:00Z'),
      transactionReference: 'TXN-MOMO-88219',
      orderStatus: 'COMPLETED',
      paymentStatus: 'PARTIALLY PAID',
      currency: 'TZS',
      merchant: {
        businessName: 'Kariakoo Tech Hub',
        address: 'Dar es Salaam',
        phone: '+255755000111',
        email: 'billing@kariakootech.co.tz',
        website: 'https://kariakootech.co.tz',
      },
      customer: {
        name: 'Asha Juma',
        phone: '+255712345678',
        deliveryAddress: 'Mikocheni B, Dar es Salaam',
      },
      items: manyItems,
      financials: {
        subtotal,
        discountTotal: 5000,
        deliveryCharges: 10000,
        taxTotal: 0,
        grandTotal: subtotal + 5000,
        amountPaid: 100000,
        outstandingBalance: subtotal + 5000 - 100000,
      },
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(2048);
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('validates SHA-256 public tokens, blocks revoked/expired links, and strips internal IDs', async () => {
    const rawToken = 'f'.repeat(64);
    const expectedHash = hashReceiptToken(rawToken);

    (prisma as any).confirmationReceipt.findUnique.mockResolvedValueOnce({
      id: 'rcpt-secret-id',
      merchant_id: 'merch-secret-id',
      order_id: 'ord-secret-id',
      access_token_hash: expectedHash,
      receipt_number: 'RCP-20261114-TOK001',
      status: 'GENERATED',
      revoked_at: null,
      expires_at: new Date(Date.now() + 86400000),
      generated_at: new Date(),
      order_completed_at: new Date(),
      order: makeBaseOrder(),
    });

    const validRes = await getPublicReceiptByToken(rawToken);
    expect((prisma as any).confirmationReceipt.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { access_token_hash: expectedHash } })
    );
    expect(validRes.status).toBe('VALID');
    expect((validRes as any).receipt).not.toHaveProperty('id');
    expect((validRes as any).receipt).not.toHaveProperty('access_token_hash');
    expect((validRes as any).receipt).not.toHaveProperty('merchant_id');

    (prisma as any).confirmationReceipt.findUnique.mockResolvedValueOnce({
      receipt_number: 'RCP-20261114-REV001',
      status: 'REVOKED',
      revoked_at: new Date(),
      order: makeBaseOrder(),
    });
    expect(await getPublicReceiptByToken(rawToken)).toMatchObject({ status: 'REVOKED' });

    (prisma as any).confirmationReceipt.findUnique.mockResolvedValueOnce({
      receipt_number: 'RCP-20261114-EXP001',
      status: 'GENERATED',
      revoked_at: null,
      expires_at: new Date(Date.now() - 10000),
      order: makeBaseOrder(),
    });
    expect(await getPublicReceiptByToken(rawToken)).toMatchObject({ status: 'EXPIRED' });
  });

  it('bills credits via smsManagementService, refunds credits on provider rejection, and distinguishes SENT vs DELIVERED', async () => {
    const order = makeBaseOrder();
    const receiptRecord = {
      id: 'rcpt-10',
      order_id: order.id,
      receipt_number: 'RCP-20261114-SMS010',
      status: 'GENERATED',
      public_token: 'b'.repeat(64),
      sms_retry_history: '[]',
      order,
    };

    // Case A: Provider accepts SMS -> SMS_SENT (NOT SMS_DELIVERED)
    (prisma as any).confirmationReceipt.findUnique.mockResolvedValueOnce(receiptRecord);
    (prisma as any).confirmationReceipt.update.mockImplementationOnce(async ({ data }: any) => ({
      ...receiptRecord,
      ...data,
    }));

    const sentResult = await dispatchConfirmationReceiptSms('rcpt-10', {
      type: 'AUTOMATIC',
      allowAutoRetryOnFailure: false,
    });
    expect(mockDeductCredits).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: 'merch-1', reference: 'RCP-20261114-SMS010' })
    );
    expect(sentResult.sms_status).toBe('SMS_SENT');
    expect(sentResult.sms_status).not.toBe('SMS_DELIVERED');

    // Delivery webhook upgrades SMS_SENT -> SMS_DELIVERED
    await handleSmsDeliveryWebhook({ messageId: 'msg-123', status: 'DELIVERED' });
    expect((prisma as any).confirmationReceipt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sms_provider_message_id: 'msg-123' },
        data: expect.objectContaining({ sms_status: 'SMS_DELIVERED' }),
      })
    );

    // Case B: Provider rejects SMS -> refund credits via transaction & mark SMS_FAILED
    mockSendSms.mockResolvedValueOnce({ success: false, error: 'Upstream SMS gateway timeout' });
    const mockTx = {
      merchantSmsAccount: {
        findUnique: jest.fn().mockResolvedValue({ id: 'acct-1', available_credits: 49, total_consumed: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      smsCreditLedger: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce((fn: any) => fn(mockTx));
    (prisma as any).confirmationReceipt.findUnique.mockResolvedValueOnce(receiptRecord);
    (prisma as any).confirmationReceipt.update.mockImplementationOnce(async ({ data }: any) => ({
      ...receiptRecord,
      ...data,
    }));

    const failedResult = await dispatchConfirmationReceiptSms('rcpt-10', {
      type: 'AUTOMATIC',
      allowAutoRetryOnFailure: false,
    });
    expect(failedResult.sms_status).toBe('SMS_FAILED');
    expect(mockTx.merchantSmsAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { available_credits: 50, total_consumed: 0 } })
    );
    expect(mockTx.smsCreditLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'REFUND', amount: 1 }) })
    );
  });

  it('reuses the existing public receipt token on manual SMS resend without generating a new receipt', async () => {
    const existingToken = 'c'.repeat(64);
    const existingReceipt = {
      id: 'rcpt-20',
      order_id: 'ord-1',
      receipt_number: 'RCP-20261114-REUSE1',
      status: 'GENERATED',
      public_token: existingToken,
      sms_status: 'SMS_FAILED',
      sms_retry_history: JSON.stringify([
        { attempt: 1, type: 'AUTOMATIC', timestamp: new Date(Date.now() - 60000).toISOString(), status: 'SMS_FAILED' },
      ]),
    };

    const orderWithReceipt = makeBaseOrder({ status: 'COMPLETED', confirmation_receipt: existingReceipt });
    (prisma.order.findFirst as jest.Mock).mockResolvedValueOnce(orderWithReceipt);
    (prisma as any).confirmationReceipt.findUnique.mockResolvedValueOnce({
      ...existingReceipt,
      order: orderWithReceipt,
    });
    (prisma as any).confirmationReceipt.update.mockImplementationOnce(async ({ data }: any) => ({
      ...existingReceipt,
      ...data,
    }));

    const res = await resendConfirmationReceiptSms({
      orderId: 'ord-1',
      merchantId: 'merch-1',
      actorId: 'user-1',
      actorName: 'Merchant Owner',
    });

    expect((prisma as any).confirmationReceipt.create).not.toHaveBeenCalled();
    expect(res.receipt.public_token).toBe(existingToken);
    expect(mockSendSms).toHaveBeenCalledWith(
      '+255712345678',
      expect.stringContaining(`/receipt/${existingToken}`)
    );
  });
});
