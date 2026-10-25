import { Language } from '../localization';
import { prisma } from '../database/prisma';
import { MesejiSMSAdapter, normalizePhone } from './adapter';
import { smsManagementService } from '../services/smsManagementService';

/**
 * SMS Template Variables:
 * {{merchantName}}, {{customerName}}, {{customerPhone}}, {{orderNumber}},
 * {{orderStatus}}, {{driverName}}, {{driverPhone}}, {{deliveryAddress}},
 * {{trackingUrl}}, {{driverUrl}}
 */

// Customer SMS Templates (per event type)
const CUSTOMER_TEMPLATES: Record<string, string> = {
  ORDER_CREATED:
    'Hello {{customerName}}, thank you for shopping with {{merchantName}}! Order {{orderNumber}} has been received and is Pending. We will keep you updated.',
  ORDER_CONFIRMED:
    'Hello {{customerName}}, {{merchantName}} has confirmed order {{orderNumber}}. We will let you know when it is ready for delivery.',
  DRIVER_ASSIGNED:
    'Hello {{customerName}}, your {{merchantName}} order {{orderNumber}} will be delivered via {{transportMethod}} by {{driverName}}, {{driverPhone}}. Delivery: {{deliveryAddress}}. Thank you for shopping with us!',
  OUT_FOR_DELIVERY:
    'Hello {{customerName}}, your {{merchantName}} order {{orderNumber}} is now out for delivery via {{transportMethod}} with {{driverName}}. Please be ready to receive your order. Thank you for shopping with us!',
  DRIVER_ARRIVED:
    '🚚 Your delivery is almost here! Your driver {{driverName}} is nearby. Please be ready to receive your order for {{merchantName}} (Order #{{orderNumber}}).',
  DRIVER_NEARBY:
    '🚚 Your delivery is almost here! Your driver {{driverName}} is nearby. Please be ready to receive your order for {{merchantName}} (Order #{{orderNumber}}).',
  ORDER_DELIVERED:
    '📦 Your order {{orderNumber}} has been successfully delivered. Thank you for shopping with {{merchantName}}. ⭐ Please rate your delivery experience: {{ratingUrl}}',
  ORDER_CANCELLED:
    'Hello {{customerName}}, your {{merchantName}} order {{orderNumber}} has been cancelled. Please contact us for more details.',
};

// Driver SMS Templates (per event type)
const DRIVER_TEMPLATES: Record<string, string> = {
  DRIVER_ASSIGNED:
    'New Delivery Assigned 🚚\n\nOrder: #{{orderNumber}}\nCustomer: {{customerName}}\nDelivery: {{deliveryAddress}}\n\nOpen Delivery: {{driverUrl}}',
  OUT_FOR_DELIVERY:
    'Hello {{driverName}}, please confirm you are on the way with {{merchantName}} order #{{orderNumber}} to {{deliveryAddress}}.',
  ORDER_DELIVERED:
    'Hello {{driverName}}, delivery of {{merchantName}} order #{{orderNumber}} has been completed. Thank you!',
  ORDER_CANCELLED:
    'Hello {{driverName}}, {{merchantName}} order #{{orderNumber}} has been cancelled.',
};

export const SW_CUSTOMER_TEMPLATES: Record<string, string> = {
  ORDER_CREATED: 'Habari {{customerName}}, asante kwa kununua kutoka {{merchantName}}! Oda {{orderNumber}} imepokelewa na inasubiri. Tutakupa taarifa zaidi.',
  ORDER_CONFIRMED: 'Habari {{customerName}}, {{merchantName}} amethibitisha oda {{orderNumber}}. Tutakujulisha ikiwa tayari kusafirishwa.',
  DRIVER_ASSIGNED: 'Habari {{customerName}}, oda yako {{orderNumber}} kutoka {{merchantName}} italetwa kwa {{transportMethod}} na {{driverName}}, {{driverPhone}}. Anwani: {{deliveryAddress}}. Asante kwa kununua kwetu!',
  OUT_FOR_DELIVERY: 'Habari {{customerName}}, oda yako {{orderNumber}} kutoka {{merchantName}} iko njiani kwa {{transportMethod}} na {{driverName}}. Tafadhali jiandae kuipokea. Asante kwa kununua kwetu!',
  DRIVER_ARRIVED: 'Mzigo wako unakaribia kufika! Dereva {{driverName}} yuko karibu. Jiandae kupokea oda {{orderNumber}} kutoka {{merchantName}}.',
  DRIVER_NEARBY: 'Mzigo wako unakaribia kufika! Dereva {{driverName}} yuko karibu. Jiandae kupokea oda {{orderNumber}} kutoka {{merchantName}}.',
  ORDER_DELIVERED: 'Oda yako {{orderNumber}} imefikishwa. Asante kwa kununua kutoka {{merchantName}}. Tafadhali tathmini huduma: {{ratingUrl}}',
  ORDER_CANCELLED: 'Habari {{customerName}}, oda yako {{orderNumber}} kutoka {{merchantName}} imeghairiwa. Wasiliana nasi kwa taarifa zaidi.'
};
export const SW_DRIVER_TEMPLATES: Record<string, string> = {
  DRIVER_ASSIGNED: 'Umepangiwa mzigo mpya. Oda: {{orderNumber}}. Mteja: {{customerName}}. Anwani: {{deliveryAddress}}. Fungua: {{driverUrl}}',
  OUT_FOR_DELIVERY: 'Habari {{driverName}}, thibitisha umeanza safari ya oda {{orderNumber}} kutoka {{merchantName}} kwenda {{deliveryAddress}}.',
  ORDER_DELIVERED: 'Habari {{driverName}}, usafirishaji wa oda {{orderNumber}} kutoka {{merchantName}} umekamilika. Asante!',
  ORDER_CANCELLED: 'Habari {{driverName}}, oda {{orderNumber}} kutoka {{merchantName}} imeghairiwa.'
};
export function orderMessageTemplate(eventType: string, recipientType: 'CUSTOMER' | 'DRIVER', language: Language) {
  const english = recipientType === 'CUSTOMER' ? CUSTOMER_TEMPLATES : DRIVER_TEMPLATES;
  const swahili = recipientType === 'CUSTOMER' ? SW_CUSTOMER_TEMPLATES : SW_DRIVER_TEMPLATES;
  return (language === 'sw' ? swahili[eventType] : undefined) ?? english[eventType];
}

export function formatTransportMethod(vehicleInfo?: string | null, language: Language = 'en'): string {
  const code = (vehicleInfo || 'BODA').toUpperCase();
  if (code.includes('BAJAJI')) {
    return 'Bajaji';
  }
  if (code.includes('BUS') || code.includes('BASI')) {
    return language === 'sw' ? 'Basi' : 'Bus';
  }
  if (code.includes('PERSONAL') || code.includes('BINAFSI')) {
    return language === 'sw' ? 'Uwasilishaji Binafsi' : 'Personal Delivery';
  }
  return 'Boda Boda';
}

interface TemplateVars {
  merchantName: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  orderStatus: string;
  driverName: string;
  driverPhone: string;
  deliveryAddress: string;
  trackingUrl: string;
  driverUrl: string;
  ratingUrl?: string;
  transportMethod?: string;
  vehicleInfo?: string | null;
}

function replaceVariables(template: string, vars: TemplateVars, language: Language = 'en'): string {
  let result = template;
  result = result.replace(/\{\{merchantName\}\}/g, vars.merchantName || 'LUMO');
  result = result.replace(/\{\{customerName\}\}/g, vars.customerName || 'Customer');
  result = result.replace(/\{\{customerPhone\}\}/g, vars.customerPhone || '');
  result = result.replace(/\{\{orderNumber\}\}/g, vars.orderNumber || '');
  result = result.replace(/\{\{orderStatus\}\}/g, vars.orderStatus || '');
  result = result.replace(/\{\{driverName\}\}/g, vars.driverName || 'Driver');
  result = result.replace(/\{\{driverPhone\}\}/g, vars.driverPhone || '');
  result = result.replace(/\{\{deliveryAddress\}\}/g, vars.deliveryAddress || '');
  result = result.replace(/\{\{trackingUrl\}\}/g, vars.trackingUrl || '');
  result = result.replace(/\{\{driverUrl\}\}/g, vars.driverUrl || '');
  result = result.replace(/\{\{ratingUrl\}\}/g, vars.ratingUrl || '');
  const transportMethod = vars.transportMethod || formatTransportMethod(vars.vehicleInfo, language);
  result = result.replace(/\{\{transportMethod\}\}/g, transportMethod);
  return result;
}

const smsAdapter = new MesejiSMSAdapter();

/**
 * Dispatch an order notification with idempotency.
 * Generates the SMS from templates and sends via the SMS adapter.
 */
export async function dispatchOrderNotification(params: {
  orderId: string;
  eventType: string;
  recipientType: 'CUSTOMER' | 'DRIVER';
  recipientPhone: string;
  vars: TemplateVars;
  language?: Language;
}): Promise<void> {
  const { orderId, eventType, recipientType, recipientPhone, vars } = params;

  // Build idempotency key: order_id + event_type + recipient_type
  const idempotencyKey = `${orderId}:${eventType}:${recipientType}`;

  try {
    // Check for duplicate
    const existing = await prisma.orderNotification.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existing) {
      console.log(`[ORDER NOTIFICATION] Skipping duplicate: ${idempotencyKey}`);
      return;
    }

    // Select template
    const template = orderMessageTemplate(eventType, recipientType, params.language || 'en');

    if (!template) {
      console.log(`[ORDER NOTIFICATION] No template for ${recipientType}/${eventType}`);
      return;
    }

    const messageBody = replaceVariables(template, vars, params.language || 'en');

    // Create notification record
    const notification = await prisma.orderNotification.create({
      data: {
        order_id: orderId,
        event_type: eventType,
        recipient_type: recipientType,
        recipient_phone: recipientPhone,
        message_body: messageBody,
        idempotency_key: idempotencyKey,
        channel: 'SMS',
        status: 'QUEUED',
      },
    });

    // Async send
    setImmediate(async () => {
      try {
        // Billable SMS deduction check
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { merchant_id: true, order_number: true },
        });

        if (order?.merchant_id) {
          const deductRes = await smsManagementService.deductCredits({
            merchantId: order.merchant_id,
            messageBody,
            reason: `Order #${order.order_number} ${eventType} SMS`,
            reference: orderId,
          });

          if (!deductRes.allowed) {
            console.warn(
              `[SMS QUOTA] Merchant ${order.merchant_id} has insufficient credits (${deductRes.remainingCredits} available, needed ${deductRes.units}). SMS not dispatched.`
            );
            await prisma.orderNotification.update({
              where: { id: notification.id },
              data: {
                status: 'FAILED',
                failed_at: new Date(),
                failure_reason: 'Insufficient merchant SMS credits. Please top up your SMS balance in Merchant Dashboard.',
              },
            });
            return;
          }
        }

        const result = await smsAdapter.sendSMS(recipientPhone, messageBody);
        if (result.success) {
          await prisma.orderNotification.update({
            where: { id: notification.id },
            data: {
              status: 'SENT',
              provider_message_id: result.messageId,
              sent_at: new Date(),
              delivered_at: new Date(),
            },
          });
        } else {
          await prisma.orderNotification.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              failed_at: new Date(),
              failure_reason: result.error || 'Provider dispatch failed',
            },
          });
        }
      } catch (err: any) {
        console.error('[ORDER NOTIFICATION DISPATCH ERROR]', err);
        await prisma.orderNotification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            failed_at: new Date(),
            failure_reason: err.message || 'Unknown error',
          },
        });
      }
    });
  } catch (err) {
    console.error('[ORDER NOTIFICATION SERVICE ERROR]', err);
  }
}

/**
 * Dispatch both Customer and Driver notifications for an order event.
 */
export async function dispatchOrderEvent(params: {
  orderId: string;
  eventType: string;
  customerPhone: string;
  driverPhone?: string;
  vars: TemplateVars;
  language?: Language;
}): Promise<void> {
  const { orderId, eventType, customerPhone, driverPhone, vars } = params;

  // Use the saved preference of the account that created the order. Existing
  // stored messages remain unchanged; language affects only future notifications.
  let language: Language = params.language || 'en';
  if (!params.language) {
    const created = await prisma.orderEvent.findFirst({ where: { order_id: orderId, event_type: 'ORDER_CREATED' }, select: { actor_reference: true }, orderBy: { timestamp: 'asc' } });
    if (created?.actor_reference) {
      const user = await prisma.merchantUser.findUnique({ where: { id: created.actor_reference }, select: { language: true } });
      language = user?.language === 'sw' ? 'sw' : 'en';
    }
  }
  // Populate vehicleInfo if missing
  if (!vars.vehicleInfo && orderId) {
    try {
      const orderRec = await prisma.order.findUnique({
        where: { id: orderId },
        select: { vehicle_info: true, driver: { select: { vehicle_info: true } } },
      });
      if (orderRec) {
        vars.vehicleInfo = orderRec.vehicle_info || orderRec.driver?.vehicle_info || 'BODA';
      }
    } catch {
      // Ignore lookup error if database disconnected or mocked
    }
  }

  // Customer notification
  if (CUSTOMER_TEMPLATES[eventType]) {
    await dispatchOrderNotification({
      orderId,
      eventType,
      recipientType: 'CUSTOMER',
      recipientPhone: customerPhone,
      vars,
      language,
    });
  }

  // Driver notification (only if driver phone available and event applies to driver)
  if (driverPhone && DRIVER_TEMPLATES[eventType]) {
    await dispatchOrderNotification({
      orderId,
      eventType,
      recipientType: 'DRIVER',
      recipientPhone: driverPhone,
      vars,
      language,
    });
  }
}
