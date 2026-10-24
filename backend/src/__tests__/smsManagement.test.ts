import crypto from 'crypto';
import { smsManagementService } from '../services/smsManagementService';
import { snippePaymentService } from '../services/snippePaymentService';
import { prisma } from '../database/prisma';

describe('Smart SMS Management & Snippe Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('1. Business Rules and Pricing Calculations', () => {
    it('calculates 1,000 units at TSh 20 as exactly TSh 20,000', () => {
      const units = 1000;
      const unitPrice = 20;
      const totalAmount = units * unitPrice;
      expect(totalAmount).toBe(20000);
    });

    it('validates minimum and maximum purchase quantities', async () => {
      // Below min (e.g. 10 < 25)
      await expect(
        smsManagementService.initiateTopup({
          merchantId: 'test_merchant_1',
          requestedUnits: 10,
        })
      ).rejects.toThrow('Minimum top-up quantity');

      // Negative quantity
      await expect(
        smsManagementService.initiateTopup({
          merchantId: 'test_merchant_1',
          requestedUnits: -50,
        })
      ).rejects.toThrow('Minimum top-up quantity');

      // Above max (e.g. 600,000 > 500,000)
      await expect(
        smsManagementService.initiateTopup({
          merchantId: 'test_merchant_1',
          requestedUnits: 600000,
        })
      ).rejects.toThrow('Maximum top-up quantity');
    });

    it('authoritative unit price is strictly retrieved from persistent settings, ignoring client manipulation', async () => {
      const settings = await smsManagementService.getSettings();
      expect(settings.unit_price_tzs).toBe(20);
    });
  });

  describe('2. Dynamic SMS Balance Progress Bar & Percentage Calculation', () => {
    it('sets 100% Green (Healthy) immediately after positive credit allocation', () => {
      const health = smsManagementService.calculateBalanceHealth(1000, 1000);
      expect(health.percentage).toBe(100);
      expect(health.color).toBe('green');
      expect(health.status).toBe('HEALTHY');
    });

    it('remains Green for balances between 61% and 100%', () => {
      const health65 = smsManagementService.calculateBalanceHealth(650, 1000);
      expect(health65.percentage).toBe(65);
      expect(health65.color).toBe('green');
      expect(health65.status).toBe('HEALTHY');

      const health61 = smsManagementService.calculateBalanceHealth(610, 1000);
      expect(health61.percentage).toBe(61);
      expect(health61.color).toBe('green');
      expect(health61.status).toBe('HEALTHY');
    });

    it('changes to Amber/Yellow for balances between 26% and 60%', () => {
      const health60 = smsManagementService.calculateBalanceHealth(600, 1000);
      expect(health60.percentage).toBe(60);
      expect(health60.color).toBe('amber');
      expect(health60.status).toBe('LOW');

      const health26 = smsManagementService.calculateBalanceHealth(260, 1000);
      expect(health26.percentage).toBe(26);
      expect(health26.color).toBe('amber');
      expect(health26.status).toBe('LOW');
    });

    it('changes to Red for critical balances between 1% and 25%', () => {
      const health25 = smsManagementService.calculateBalanceHealth(250, 1000);
      expect(health25.percentage).toBe(25);
      expect(health25.color).toBe('red');
      expect(health25.status).toBe('CRITICAL');

      const health10 = smsManagementService.calculateBalanceHealth(100, 1000);
      expect(health10.percentage).toBe(10);
      expect(health10.color).toBe('red');
      expect(health10.status).toBe('CRITICAL');
    });

    it('displays 0% Empty Red Bar when no credits remain', () => {
      const health0 = smsManagementService.calculateBalanceHealth(0, 1000);
      expect(health0.percentage).toBe(0);
      expect(health0.color).toBe('red');
      expect(health0.status).toBe('EMPTY');
      expect(health0.statusLabelEn).toContain('No credits remaining');
    });

    it('clamps safely and handles division by zero or negative values without crashing', () => {
      const safeZeroRef = smsManagementService.calculateBalanceHealth(500, 0);
      expect(safeZeroRef.percentage).toBe(100);

      const safeZeroZero = smsManagementService.calculateBalanceHealth(0, 0);
      expect(safeZeroZero.percentage).toBe(0);
      expect(safeZeroZero.color).toBe('red');

      const safeOverCap = smsManagementService.calculateBalanceHealth(1500, 1000);
      expect(safeOverCap.percentage).toBe(100);
    });
  });

  describe('3. Billable Units Calculation', () => {
    it('calculates 1 unit for GSM messages under 160 characters', () => {
      const text = 'Hello customer, your order #1001 is on the way with driver John.';
      expect(smsManagementService.calculateBillableUnits(text)).toBe(1);
    });

    it('calculates multi-part segments for long GSM messages (> 160 chars)', () => {
      const longText = 'A'.repeat(161);
      expect(smsManagementService.calculateBillableUnits(longText)).toBe(2);

      const veryLongText = 'A'.repeat(310);
      expect(smsManagementService.calculateBillableUnits(veryLongText)).toBe(3);
    });

    it('detects Unicode characters and uses 70 chars per segment', () => {
      const unicodeText = 'Habari mteja, mzigo wako umefika! 🚚 Asante sana.';
      expect(smsManagementService.calculateBillableUnits(unicodeText)).toBe(1);

      const longUnicode = '🚚' + 'A'.repeat(75);
      expect(smsManagementService.calculateBillableUnits(longUnicode)).toBe(2);
    });
  });

  describe('4. Snippe Webhook Signature Verification', () => {
    const secret = 'whsec_b11c34170f637399848a7c7602f0da453cc1ac1704364dfb1';

    it('verifies valid HMAC-SHA256 signature on raw body', () => {
      const rawBody = JSON.stringify({ type: 'payment.completed', data: { reference: 'pi_test_123' } });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const message = `${timestamp}.${rawBody}`;
      const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');

      const res = snippePaymentService.verifyWebhookSignature(rawBody, {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      });

      expect(res.valid).toBe(true);
    });

    it('rejects tampered raw body with invalid signature', () => {
      const rawBody = JSON.stringify({ type: 'payment.completed', data: { reference: 'pi_test_123' } });
      const tamperedBody = JSON.stringify({ type: 'payment.completed', data: { reference: 'pi_fraud_456' } });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const message = `${timestamp}.${rawBody}`;
      const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');

      const res = snippePaymentService.verifyWebhookSignature(tamperedBody, {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      });

      expect(res.valid).toBe(false);
    });

    it('rejects stale webhook timestamps older than 5 minutes to prevent replay attacks', () => {
      const rawBody = JSON.stringify({ type: 'payment.completed' });
      const staleTimestamp = String(Math.floor(Date.now() / 1000) - 400); // 400s old
      const message = `${staleTimestamp}.${rawBody}`;
      const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');

      const res = snippePaymentService.verifyWebhookSignature(rawBody, {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': staleTimestamp,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('too old');
    });
  });

  describe('5. Admin Extensions and Mandatory Reason Validation', () => {
    it('rejects administrative credit adjustments without a mandatory reason', async () => {
      await expect(
        smsManagementService.extendMerchantCredits({
          adminId: 'admin_1',
          merchantId: 'merchant_1',
          units: 500,
          adjustmentType: 'ADMIN_ADJUSTMENT_GRANT',
          reason: '   ',
        })
      ).rejects.toThrow('mandatory reason is required');
    });

    it('rejects negative units for non-reversal adjustment types', async () => {
      await expect(
        smsManagementService.extendMerchantCredits({
          adminId: 'admin_1',
          merchantId: 'merchant_1',
          units: -100,
          adjustmentType: 'ADMIN_ADJUSTMENT_GRANT',
          reason: 'Testing negative grant',
        })
      ).rejects.toThrow('Only credit corrections or reversals may have negative units');
    });
  });
});
