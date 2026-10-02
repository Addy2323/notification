import { prisma } from '../database/prisma';
import { config } from '../config';

export interface NotificationPayload {
  deliveryId: string;
  eventId?: string;
  eventType: string;
  channel?: 'SMS' | 'WHATSAPP' | 'EMAIL';
  recipient: string;
  merchantName: string;
  productName: string;
  driverName?: string;
  trackingUrl: string;
  businessLocation?: string;
}

export interface INotificationAdapter {
  sendSMS(recipient: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '255' + cleaned.substring(1);
  }
  return cleaned;
}

export class MesejiSMSAdapter implements INotificationAdapter {
  private getApiUrl(): string {
    return process.env.MESEJI_API_URL || 'https://meseji.co.tz/api/v1/sms/send';
  }

  private getApiKey(): string {
    return process.env.MESEJI_API_KEY || process.env.SMS_PROVIDER_API_KEY || '';
  }

  private isMockMode(): boolean {
    const mode = (process.env.SMS_MODE || '').toLowerCase();
    if (mode === 'mock' || mode === 'test' || process.env.ENABLE_SMS_MOCK === 'true') {
      return true;
    }
    const key = this.getApiKey().trim();
    if (!key || key === 'your_meseji_api_key' || key === 'mock_sms_key' || key === 'your_api_key_here') {
      return true;
    }
    return false;
  }

  async sendSMS(recipient: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const formattedRecipient = normalizePhone(recipient);
      const apiKey = this.getApiKey().trim();

      if (this.isMockMode()) {
        const messageId = `msg_mock_${Date.now()}`;
        console.log(`[SMS MOCK MODE] To: ${formattedRecipient} (${recipient}) | Content: "${message}" | Mock ID: ${messageId}`);
        return { success: true, messageId };
      }

      const apiUrl = this.getApiUrl();
      const senderId = process.env.MESEJI_SENDER_ID || 'MESEJI';
      const payload = {
        contacts: formattedRecipient,
        message: message,
        sender_id: senderId,
      };

      console.log(`[MesejiSMS Dispatch] Sending to ${formattedRecipient} via ${apiUrl} (SenderID: ${senderId})...`);

      // 10-second timeout to prevent infinite hangs when Meseji API is unreachable
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        };

        if (process.env.MESEJI_AUTH_TYPE === 'bearer') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const responseText = await response.text();
        let responseData: any = {};
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }

        console.log(`[MesejiSMS HTTP ${response.status}] Raw Body: ${responseText.substring(0, 300)}`);

        if (response.ok && (responseData.status === 'success' || responseData.code === 200 || responseData.batch_id || responseData.success === true)) {
          const batchId = responseData.batch_id || responseData.message_id || responseData.id || 'sent';
          console.log(`[MesejiSMS Success] Sent to ${formattedRecipient}: batch_id=${batchId}`);
          return { success: true, messageId: String(batchId) };
        } else {
          const rawError = responseData.error || responseData.message || responseData.description || `HTTP Status ${response.status}`;
          const errorMsg = typeof rawError === 'object' ? JSON.stringify(rawError) : String(rawError);
          console.warn(`[MesejiSMS Failed] Gateway response: ${errorMsg}`);
          return { success: false, error: `SMS gateway error: ${errorMsg}` };
        }
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        throw fetchErr;
      }
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout
        ? 'SMS gateway timed out (Meseji API unreachable). Please check server network connection.'
        : `SMS delivery failed: ${err.message}`;
      console.error(`[MesejiSMS Error] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }
}

export class NotificationService {
  private adapter: INotificationAdapter;

  constructor() {
    this.adapter = new MesejiSMSAdapter();
  }

  /**
   * Builds populated notification template body based on event type.
   */
  public buildTemplateBody(payload: NotificationPayload): string {
    const { eventType, merchantName, productName, driverName, trackingUrl, businessLocation } = payload;
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    switch (eventType) {
      case 'DELIVERY_CREATED':
        return `${merchantName} has registered a delivery for ${productName} at ${currentTime}. Your assigned driver is ${driverName}. Track it here: ${trackingUrl}`;
      case 'DRIVER_ASSIGNED':
        const mapQ = businessLocation ? `https://maps.google.com/?q=${encodeURIComponent(businessLocation)}` : '';
        return `LUMO Alert: You have been assigned to pick up ${productName} from ${merchantName}. Click here for the shop map: ${mapQ}`.trim();
      case 'ON_THE_WAY':
        return `Your ${productName} from ${merchantName} is on the way. Driver: ${driverName || 'Driver'}. Track: ${trackingUrl}`;
      case 'ARRIVED':
        return `Your driver from ${merchantName} has arrived at the delivery location. Please receive your ${productName}.`;
      case 'DELIVERED':
        return `Your ${productName} has been marked as delivered. Thank you.`;
      case 'DELIVERY_CANCELLED':
        return `Your delivery of ${productName} from ${merchantName} has been cancelled. Contact merchant for details.`;
      default:
        return `Update on your delivery of ${productName} from ${merchantName}: ${trackingUrl}`;
    }
  }

  /**
   * Enqueues and triggers async notification processing without blocking calling transaction.
   */
  public async dispatchNotification(payload: NotificationPayload): Promise<void> {
    try {
      const channel = payload.channel || 'SMS';
      const body = this.buildTemplateBody(payload);

      // Create notification record in QUEUED state
      const notification = await prisma.notification.create({
        data: {
          delivery_id: payload.deliveryId,
          event_id: payload.eventId || null,
          channel,
          recipient: payload.recipient,
          status: 'QUEUED',
        },
      });

      // Execute async provider dispatch (non-blocking)
      setImmediate(async () => {
        try {
          const result = await this.adapter.sendSMS(payload.recipient, body);
          if (result.success) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: {
                status: 'SENT',
                provider_message_id: result.messageId,
                sent_at: new Date(),
                delivered_at: new Date(),
              },
            });
          } else {
            await prisma.notification.update({
              where: { id: notification.id },
              data: {
                status: 'FAILED',
                failed_at: new Date(),
                failure_reason: result.error || 'Provider dispatch failed',
              },
            });
          }
        } catch (err: any) {
          console.error('[NOTIFICATION DISPATCH ERROR]', err);
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              failed_at: new Date(),
              failure_reason: err.message || 'Unknown network error',
            },
          });
        }
      });
    } catch (err) {
      // Notification record error should never break main delivery state flow
      console.error('[NOTIFICATION SERVICE ERROR]', err);
    }
  }
}

export const notificationService = new NotificationService();
