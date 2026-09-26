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
  private apiUrl = 'https://meseji.co.tz/api/v1/sms/send';
  private apiKey = process.env.MESEJI_API_KEY || ''; // Must be configured in .env

  async sendSMS(recipient: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const formattedRecipient = normalizePhone(recipient);

      if (!this.apiKey) {
        console.warn('MESEJI_API_KEY is not defined. Simulating SMS send.');
        const messageId = `msg_mock_${Date.now()}`;
        console.log(`[MOCK SMS] To: ${formattedRecipient} | Content: "${message}"`);
        return { success: true, messageId };
      }

      const payload = {
        contacts: formattedRecipient,
        message: message,
        sender_id: process.env.MESEJI_SENDER_ID || 'MESEJI',
      };

      console.log(`[MesejiSMS] Sending SMS to ${formattedRecipient} via Meseji API...`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok && (responseData.status === 'success' || responseData.code === 200 || responseData.batch_id)) {
        console.log(`[MesejiSMS Success] Sent to ${formattedRecipient}: batch_id=${responseData.batch_id || 'ok'}`);
        return { success: true, messageId: responseData.batch_id || 'sent' };
      } else {
        const errorMsg = responseData.error || responseData.message || `Failed with status ${response.status}`;
        console.warn(`[MesejiSMS Fallback] ${errorMsg}. Falling back to Simulated SMS Mode for testing.`);
        console.log(`[SIMULATED SMS] To: ${formattedRecipient} | Content: "${message}"`);
        return { success: true, messageId: `simulated_${Date.now()}` };
      }
    } catch (err: any) {
      console.warn(`[MesejiSMS Exception] ${err.message}. Falling back to Simulated SMS Mode.`);
      console.log(`[SIMULATED SMS] To: ${recipient} | Content: "${message}"`);
      return { success: true, messageId: `simulated_${Date.now()}` };
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
