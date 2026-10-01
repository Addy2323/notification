import { prisma } from '../database/prisma';
import { MesejiSMSAdapter, normalizePhone } from './adapter';

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
    'Hello {{customerName}}, your {{merchantName}} order {{orderNumber}} will be delivered by {{driverName}}, {{driverPhone}}. Delivery: {{deliveryAddress}}. Thank you for shopping with us!',
  OUT_FOR_DELIVERY:
    'Hello {{customerName}}, your {{merchantName}} order {{orderNumber}} is now out for delivery with {{driverName}}. Please be ready to receive your order. Thank you for shopping with us!',
  DRIVER_ARRIVED:
    '🚚 Your delivery is almost here! Your driver {{driverName}} is nearby. Please be ready to receive your order for {{merchantName}} (Order #{{orderNumber}}).',
  DRIVER_NEARBY:
    '🚚 Your delivery is almost here! Your driver {{driverName}} is nearby. Please be ready to receive your order for {{merchantName}} (Order #{{orderNumber}}).',
  ORDER_DELIVERED:
    'Hello {{customerName}}, your {{merchantName}} order {{orderNumber}} has been delivered successfully. Thank you for shopping with {{merchantName}}!',
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
}

function replaceVariables(template: string, vars: TemplateVars): string {
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
    const templates = recipientType === 'CUSTOMER' ? CUSTOMER_TEMPLATES : DRIVER_TEMPLATES;
    const template = templates[eventType];

    if (!template) {
      console.log(`[ORDER NOTIFICATION] No template for ${recipientType}/${eventType}`);
      return;
    }

    const messageBody = replaceVariables(template, vars);

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
}): Promise<void> {
  const { orderId, eventType, customerPhone, driverPhone, vars } = params;

  // Customer notification
  if (CUSTOMER_TEMPLATES[eventType]) {
    await dispatchOrderNotification({
      orderId,
      eventType,
      recipientType: 'CUSTOMER',
      recipientPhone: customerPhone,
      vars,
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
    });
  }
}
