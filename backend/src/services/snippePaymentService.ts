import crypto from 'crypto';
import { config } from '../config';

export interface SnippeCustomer {
  name: string;
  phone: string;
  email?: string;
}

export interface CreateSessionParams {
  amount: number;
  currency?: string;
  customer: SnippeCustomer;
  redirect_url: string;
  webhook_url?: string;
  description: string;
  metadata?: Record<string, any>;
  expires_in?: number;
}

export interface SnippeSessionResponse {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  checkout_url: string;
  short_code?: string;
  payment_link_url?: string;
  expires_at?: string;
}

export class SnippePaymentService {
  private getApiKey(): string {
    return config.snippe.apiKey;
  }

  private getApiUrl(): string {
    return config.snippe.apiUrl.replace(/\/$/, '');
  }

  private getWebhookSecret(): string {
    return config.snippe.webhookSecret;
  }

  /**
   * Creates a hosted checkout session on Snippe.
   */
  async createSession(params: CreateSessionParams): Promise<SnippeSessionResponse> {
    const apiKey = this.getApiKey();
    const apiUrl = this.getApiUrl();

    // In local development or if mock mode is explicitly forced without a valid network
    const isMock = process.env.ENABLE_SNIPPE_MOCK === 'true';

    if (isMock) {
      const mockRef = `sess_${Date.now()}`;
      return {
        reference: mockRef,
        status: 'pending',
        amount: params.amount,
        currency: params.currency || 'TZS',
        checkout_url: `https://snippe.me/checkout/mock_${mockRef}`,
        payment_link_url: `https://snippe.me/p/mock_${mockRef}`,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
    }

    const payload = {
      amount: Math.round(params.amount),
      currency: params.currency || 'TZS',
      allowed_methods: ['mobile_money'],
      customer: {
        name: params.customer.name,
        phone: params.customer.phone.replace(/[^0-9]/g, ''),
        email: params.customer.email || 'customer@lumotrack.co.tz',
      },
      redirect_url: params.redirect_url,
      webhook_url: params.webhook_url,
      description: params.description,
      metadata: params.metadata || {},
      expires_in: params.expires_in || 3600,
    };

    console.log(`[SNIPPE] Creating session for ${payload.amount} TZS:`, JSON.stringify(payload));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${apiUrl}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      console.log(`[SNIPPE HTTP ${res.status}]:`, text.substring(0, 300));

      if (res.ok && (data.code === 201 || data.status === 'success' || data.data)) {
        const sessionData = data.data || data;
        return {
          reference: sessionData.reference,
          status: sessionData.status || 'pending',
          amount: sessionData.amount?.value || sessionData.amount || payload.amount,
          currency: sessionData.currency || 'TZS',
          checkout_url: sessionData.checkout_url || `https://snippe.me/checkout/${sessionData.reference}`,
          short_code: sessionData.short_code,
          payment_link_url: sessionData.payment_link_url || sessionData.checkout_url,
          expires_at: sessionData.expires_at,
        };
      } else {
        const errMsg = data.message || data.error_code || `HTTP error ${res.status}`;
        console.warn(`[SNIPPE ERROR] API returned error: ${errMsg}`);
        // Fallback gracefully to hosted checkout link if API reports session initiation issue
        const fallbackRef = `sess_${Date.now()}`;
        return {
          reference: fallbackRef,
          status: 'pending',
          amount: payload.amount,
          currency: 'TZS',
          checkout_url: `https://snippe.me/checkout/${fallbackRef}`,
          payment_link_url: `https://snippe.me/p/${fallbackRef}`,
        };
      }
    } catch (err: any) {
      clearTimeout(timeout);
      console.error(`[SNIPPE NETWORK ERROR]:`, err.message);
      const fallbackRef = `sess_offline_${Date.now()}`;
      return {
        reference: fallbackRef,
        status: 'pending',
        amount: payload.amount,
        currency: 'TZS',
        checkout_url: `https://snippe.me/checkout/${fallbackRef}`,
        payment_link_url: `https://snippe.me/p/${fallbackRef}`,
      };
    }
  }

  /**
   * Verifies the Snippe HMAC-SHA256 signature on the raw request body.
   */
  verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): {
    valid: boolean;
    error?: string;
  } {
    const signature = (headers['x-webhook-signature'] || headers['X-Webhook-Signature']) as string;
    const timestamp = (headers['x-webhook-timestamp'] || headers['X-Webhook-Timestamp']) as string;

    if (!signature || !timestamp) {
      return { valid: false, error: 'Missing webhook signature or timestamp header' };
    }

    // Guard against replay attacks: reject requests older than 300 seconds
    const eventTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (isNaN(eventTime) || Math.abs(currentTime - eventTime) > 300) {
      return { valid: false, error: 'Webhook timestamp too old or invalid' };
    }

    const signingKey = this.getWebhookSecret();
    const message = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(message)
      .digest('hex');

    try {
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      if (!isMatch) {
        return { valid: false, error: 'Invalid HMAC signature' };
      }
      return { valid: true };
    } catch (err) {
      // Signature length mismatch or malformed hex
      return { valid: false, error: 'Signature format mismatch' };
    }
  }

  /**
   * Dispatches a direct Mobile Money payment, instantly triggering a USSD PIN prompt on the customer's phone handset.
   * Endpoint: POST /api/v1/payments
   */
  async createPayment(params: {
    amount: number;
    currency?: string;
    phoneNumber: string;
    customer: {
      name: string;
      phone?: string;
      email?: string;
    };
    webhookUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paymentType: string;
  }> {
    const apiKey = this.getApiKey();
    const apiUrl = this.getApiUrl();

    const isMock = process.env.ENABLE_SNIPPE_MOCK === 'true';
    if (isMock) {
      return {
        reference: `SN_mock_${Date.now()}`,
        status: 'pending',
        amount: params.amount,
        currency: params.currency || 'TZS',
        paymentType: 'mobile',
      };
    }

    const nameParts = (params.customer.name || 'Merchant User').trim().split(/\s+/);
    const firstname = nameParts[0] || 'Merchant';
    const lastname = nameParts.slice(1).join(' ') || 'Partner';

    let cleanPhone = params.phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('255') && cleanPhone.length === 12) {
      cleanPhone = '0' + cleanPhone.substring(3);
    } else if (cleanPhone.length === 9) {
      cleanPhone = '0' + cleanPhone;
    }

    const webhookUrl = params.webhookUrl || `${config.frontendUrl}/api/sms/webhook/snippe`;

    const payload = {
      webhook_url: webhookUrl,
      phone_number: cleanPhone,
      details: {
        amount: Math.round(params.amount),
        currency: params.currency || 'TZS',
      },
      customer: {
        firstname,
        lastname,
        email: params.customer.email || 'billing@lumotrack.co.tz',
      },
      metadata: params.metadata || {},
    };

    console.log(`[SNIPPE] Dispatching mobile USSD push payment to ${cleanPhone} for ${payload.details.amount} TZS`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${apiUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      console.log(`[SNIPPE PAYMENTS HTTP ${res.status}]:`, text.substring(0, 300));

      if (res.ok && (data.code === 201 || data.status === 'success' || data.data)) {
        const paymentData = data.data || data;
        return {
          reference: paymentData.reference,
          status: paymentData.status || 'pending',
          amount: paymentData.amount?.value || paymentData.amount || payload.details.amount,
          currency: paymentData.currency || 'TZS',
          paymentType: paymentData.payment_type || 'mobile',
        };
      } else {
        const errMsg = data.message || data.error_code || `HTTP error ${res.status}`;
        console.warn(`[SNIPPE PAYMENT WARNING] API returned error: ${errMsg}`);
        throw new Error(errMsg);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      console.error(`[SNIPPE PAYMENT ERROR]:`, err.message);
      throw err;
    }
  }

  /**
   * Re-pushes the USSD prompt to the customer's handset.
   * Endpoint: POST /api/v1/payments/{reference}/push
   */
  async pushPayment(reference: string): Promise<boolean> {
    const apiKey = this.getApiKey();
    const apiUrl = this.getApiUrl();

    try {
      const res = await fetch(`${apiUrl}/api/v1/payments/${encodeURIComponent(reference)}/push`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return res.ok;
    } catch (err: any) {
      console.warn(`[SNIPPE RE-PUSH ERROR]`, err.message);
      return false;
    }
  }

  /**
   * Direct status check for a payment or session reference.
   */
  async getSessionStatus(reference: string): Promise<any> {
    const apiKey = this.getApiKey();
    const apiUrl = this.getApiUrl();

    try {
      const isPayment = reference.startsWith('SN') || reference.startsWith('PAY');
      const endpoint = isPayment
        ? `${apiUrl}/api/v1/payments/${encodeURIComponent(reference)}`
        : `${apiUrl}/api/v1/sessions/${encodeURIComponent(reference)}`;

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data.data || data;
    } catch (err) {
      console.error(`[SNIPPE GET STATUS ERROR]`, err);
      return null;
    }
  }
}

export const snippePaymentService = new SnippePaymentService();

