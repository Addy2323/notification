import * as confirmationService from '../services/receiptConfirmationService';
import { prisma } from '../database/prisma';

jest.mock('../database/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    orderReceiptConfirmation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    receiptConfirmationSetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orderNotification: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    systemIncident: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('../notifications/adapter', () => ({
  MesejiSMSAdapter: jest.fn().mockImplementation(() => ({
    sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_test_123' }),
  })),
  normalizePhone: (p: string) => p,
}));

describe('Automated Order Receipt Confirmation Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default settings mock
    (prisma as any).receiptConfirmationSetting.findUnique.mockResolvedValue({
      id: 'default',
      auto_confirm_enabled: true,
      send_delay_seconds: 0,
      reminder_enabled: false,
      template_en: 'Hello {{customerName}}, have you received your order #{{orderNumber}}? Please confirm here: {{confirmationLink}}',
      template_sw: 'Habari {{customerName}}, umepokea oda yako #{{orderNumber}}? Tafadhali thibitisha hapa: {{confirmationLink}}',
      thank_you_en: "Thank you for shopping with us! We're glad you received your order. We appreciate your support.",
      thank_you_sw: 'Asante kwa kufanya manunuzi nasi! Tunafurahi kuwa umepokea oda yako. Tunathamini uaminifu wako.',
      investigation_en: "We're sorry you haven't received your order. We're checking your order now and will get back to you shortly.",
      investigation_sw: 'Pole kwa kuwa bado hujapokea oda yako. Tunaifuatilia oda yako sasa na tutakujulisha hivi karibuni.',
    });
  });

  afterEach(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('1. Automated SMS trigger on delivery', () => {
    it('does not send confirmation SMS if order status is not DELIVERED', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord_1',
        order_number: 'LUMO-1001',
        status: 'OUT_FOR_DELIVERY',
        merchant_id: 'm_1',
      });

      const result = await confirmationService.triggerOrderReceiptConfirmation('ord_1');
      expect(result).toBeNull();
      expect((prisma as any).orderReceiptConfirmation.create).not.toHaveBeenCalled();
    });

    it('triggers receipt confirmation for DELIVERED order and creates confirmation record', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord_1',
        order_number: 'LUMO-1001',
        status: 'DELIVERED',
        merchant_id: 'm_1',
        customer_name: 'Juma Selemani',
        customer_phone: '255712345678',
        receipt_confirmation: null,
      });

      (prisma as any).orderReceiptConfirmation.create.mockResolvedValue({
        id: 'conf_1',
        order_id: 'ord_1',
        merchant_id: 'm_1',
        confirmation_token: 'test_token_123',
        sms_status: 'QUEUED',
      });

      (prisma.orderNotification.create as jest.Mock).mockResolvedValue({ id: 'notif_1' });

      const result = await confirmationService.triggerOrderReceiptConfirmation('ord_1');

      expect((prisma as any).orderReceiptConfirmation.create).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({ receipt_status: 'AWAITING_RESPONSE' }),
        })
      );
      expect(prisma.orderNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order_id: 'ord_1',
            event_type: 'RECEIPT_CONFIRMATION_REQUEST',
            recipient_phone: '255712345678',
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it('skips duplicate dispatch if customer already responded', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord_1',
        order_number: 'LUMO-1001',
        status: 'DELIVERED',
        merchant_id: 'm_1',
        receipt_confirmation: {
          id: 'conf_1',
          customer_response: 'RECEIVED',
          confirmation_token: 'test_token_123',
        },
      });

      const result = await confirmationService.triggerOrderReceiptConfirmation('ord_1');
      expect(result).toEqual(expect.objectContaining({ customer_response: 'RECEIVED' }));
      expect((prisma as any).orderReceiptConfirmation.create).not.toHaveBeenCalled();
    });
  });

  describe('2. Public Confirmation Info', () => {
    it('returns masked customer info and essential order details', async () => {
      (prisma as any).orderReceiptConfirmation.findUnique.mockResolvedValue({
        id: 'conf_1',
        confirmation_token: 'valid_tok_123',
        customer_response: null,
        order: {
          id: 'ord_1',
          order_number: 'LUMO-1001',
          customer_name: 'Amina Kassim Bakari',
          product_name: 'Wireless Headphones',
          amount: 75000,
          delivered_at: new Date('2026-10-24T08:00:00Z'),
          status: 'DELIVERED',
          items: [],
        },
        merchant: {
          id: 'm_1',
          business_name: 'Electro Tech',
          logo_url: '/logo.png',
          brand_color: '#16794B',
          business_phone: '255700000000',
        },
      });

      const info = await confirmationService.getPublicConfirmationInfo('valid_tok_123');

      expect(info).toBeDefined();
      expect(info?.order_number).toBe('LUMO-1001');
      // Customer name should be masked for privacy (e.g. "Amina B.")
      expect(info?.masked_customer_name).toBe('Amina B.');
      expect(info?.is_already_confirmed).toBe(false);
      expect(info?.merchant.name).toBe('Electro Tech');
    });
  });

  describe('3. Customer clicks YES (Received)', () => {
    it('records RECEIVED, updates order receipt_status, and creates thank-you message', async () => {
      (prisma as any).orderReceiptConfirmation.findUnique.mockResolvedValue({
        id: 'conf_1',
        confirmation_token: 'tok_yes',
        customer_response: null,
        merchant_id: 'm_1',
        order: {
          id: 'ord_1',
          order_number: 'LUMO-1001',
          customer_name: 'Juma Selemani',
          customer_phone: '255712345678',
          merchant_id: 'm_1',
          merchant: { business_name: 'Electro Tech', business_phone: '255799999999' },
        },
      });

      (prisma as any).orderReceiptConfirmation.update.mockResolvedValue({
        id: 'conf_1',
        customer_response: 'RECEIVED',
        responded_at: new Date(),
      });

      (prisma.orderNotification.create as jest.Mock).mockResolvedValue({ id: 'notif_thank_you' });

      const res = await confirmationService.submitCustomerConfirmation({
        token: 'tok_yes',
        response: 'YES',
        ipAddress: '192.168.1.1',
      });

      expect(res.success).toBe(true);
      expect(res.response).toBe('RECEIVED');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: { receipt_status: 'RECEIVED' },
        })
      );
      expect(prisma.orderEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order_id: 'ord_1',
            event_type: 'ORDER_RECEIPT_CONFIRMED',
          }),
        })
      );
    });
  });

  describe('4. Customer clicks NO (Not Received)', () => {
    it('records NOT_RECEIVED, opens follow-up case, and triggers urgent alerts', async () => {
      (prisma as any).orderReceiptConfirmation.findUnique.mockResolvedValue({
        id: 'conf_2',
        confirmation_token: 'tok_no',
        customer_response: null,
        merchant_id: 'm_1',
        order: {
          id: 'ord_2',
          order_number: 'LUMO-1002',
          customer_name: 'Neema Joseph',
          customer_phone: '255787654321',
          merchant_id: 'm_1',
          merchant: { business_name: 'Electro Tech', business_phone: '255799999999' },
        },
      });

      (prisma as any).orderReceiptConfirmation.update.mockResolvedValue({
        id: 'conf_2',
        customer_response: 'NOT_RECEIVED',
        followup_status: 'OPEN',
        responded_at: new Date(),
      });

      (prisma.orderNotification.create as jest.Mock).mockResolvedValue({ id: 'notif_investigation' });

      const res = await confirmationService.submitCustomerConfirmation({
        token: 'tok_no',
        response: 'NO',
        ipAddress: '10.0.0.1',
      });

      expect(res.success).toBe(true);
      expect(res.response).toBe('NOT_RECEIVED');
      expect((prisma as any).orderReceiptConfirmation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customer_response: 'NOT_RECEIVED',
            followup_status: 'OPEN',
          }),
        })
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_2' },
          data: { receipt_status: 'NOT_RECEIVED' },
        })
      );
    });

    it('rejects duplicate response when customer already confirmed', async () => {
      (prisma as any).orderReceiptConfirmation.findUnique.mockResolvedValue({
        id: 'conf_2',
        confirmation_token: 'tok_duplicate',
        customer_response: 'RECEIVED',
        responded_at: new Date(),
        order: { id: 'ord_2' },
      });

      await expect(
        confirmationService.submitCustomerConfirmation({
          token: 'tok_duplicate',
          response: 'YES',
        })
      ).rejects.toThrow('ALREADY_SUBMITTED');
    });
  });

  describe('5. Staff Operational Workflow', () => {
    it('appends investigation notes to history', async () => {
      (prisma as any).orderReceiptConfirmation.findFirst.mockResolvedValue({
        id: 'conf_3',
        investigation_notes: JSON.stringify([
          { id: '1', author: 'System', role: 'SYSTEM', text: 'Case opened', created_at: '2026-10-24T08:00:00Z' },
        ]),
        order: { id: 'ord_3', customer_phone: '255711111111' },
      });

      await confirmationService.addFollowupNote({
        confirmationId: 'conf_3',
        author: 'Admin Alex',
        role: 'ADMIN',
        text: 'Called driver to verify drop-off location.',
      });

      const updateCall = (prisma as any).orderReceiptConfirmation.update.mock.calls[0][0];
      const parsedNotes = JSON.parse(updateCall.data.investigation_notes);
      expect(parsedNotes).toHaveLength(2);
      expect(parsedNotes[1].text).toBe('Called driver to verify drop-off location.');
      expect(parsedNotes[1].author).toBe('Admin Alex');
    });

    it('updates case status to RESOLVED with resolution notes', async () => {
      (prisma as any).orderReceiptConfirmation.findFirst.mockResolvedValue({
        id: 'conf_3',
        followup_status: 'OPEN',
        investigation_notes: '[]',
        order: { id: 'ord_3', customer_phone: '255711111111' },
      });

      await confirmationService.updateFollowupCase({
        confirmationId: 'conf_3',
        status: 'RESOLVED',
        resolution_notes: 'Driver handed package to neighbor; neighbor delivered to customer.',
        authorName: 'Admin Alex',
        authorRole: 'ADMIN',
      });

      const updateCall = (prisma as any).orderReceiptConfirmation.update.mock.calls[0][0];
      expect(updateCall.data.followup_status).toBe('RESOLVED');
      expect(updateCall.data.resolution_notes).toBe(
        'Driver handed package to neighbor; neighbor delivered to customer.'
      );
      expect(updateCall.data.resolved_at).toBeDefined();
    });
  });
});
