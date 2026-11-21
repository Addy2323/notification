import { prisma } from '../database/prisma';
import { config } from '../config';
import { MesejiSMSAdapter, normalizePhone } from '../notifications/adapter';

const pAny = prisma as any;
const smsAdapter = new MesejiSMSAdapter();

export function buildMerchantNewOrderSms(params: {
  merchantName: string;
  orderNumber: string;
  productSummary: string;
  totalQuantity: number;
  dashboardUrl: string;
}): string {
  const shortProduct =
    params.productSummary.length > 60
      ? `${params.productSummary.slice(0, 57)}...`
      : params.productSummary;

  return [
    'NEW ORDER RECEIVED!',
    `Hello ${params.merchantName}, you have a new order on LUMO Track.`,
    `Order: #${params.orderNumber}`,
    `Product: ${shortProduct}`,
    `Qty: ${params.totalQuantity}`,
    `View Order: ${params.dashboardUrl}`,
    'Thank you for selling with LUMO Track.',
  ].join('\n');
}

async function dispatchMerchantNotificationSmsAttempt(
  notificationId: string,
  orderNotifId: string | null,
  recipientPhone: string,
  smsBody: string,
  allowAutoRetry: boolean
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    await pAny.merchantNotification.update({
      where: { id: notificationId },
      data: {
        sms_status: 'PROCESSING',
        delivery_attempts: { increment: 1 },
      },
    });

    const result = await smsAdapter.sendSMS(normalizePhone(recipientPhone), smsBody);

    if (result.success) {
      await pAny.merchantNotification.update({
        where: { id: notificationId },
        data: {
          sms_status: 'SENT',
          provider_response: result.messageId ? `messageId:${result.messageId}` : 'SENT',
        },
      });
      if (orderNotifId) {
        await prisma.orderNotification
          .update({
            where: { id: orderNotifId },
            data: {
              status: 'SENT',
              provider_message_id: result.messageId || null,
              sent_at: new Date(),
            },
          })
          .catch(() => null);
      }
      return { success: true, messageId: result.messageId };
    }

    const failMsg = result.error || 'SMS provider dispatch failed';
    await pAny.merchantNotification.update({
      where: { id: notificationId },
      data: {
        sms_status: 'FAILED',
        provider_response: failMsg,
      },
    });
    if (orderNotifId) {
      await prisma.orderNotification
        .update({
          where: { id: orderNotifId },
          data: {
            status: 'FAILED',
            failed_at: new Date(),
            failure_reason: failMsg,
          },
        })
        .catch(() => null);
    }

    if (allowAutoRetry) {
      setTimeout(() => {
        dispatchMerchantNotificationSmsAttempt(
          notificationId,
          orderNotifId,
          recipientPhone,
          smsBody,
          false
        ).catch(() => null);
      }, 4000);
    }

    return { success: false, error: failMsg };
  } catch (err: any) {
    const errMsg = err?.message || 'Unexpected SMS dispatch error';
    await pAny.merchantNotification
      .update({
        where: { id: notificationId },
        data: {
          sms_status: 'FAILED',
          provider_response: errMsg,
        },
      })
      .catch(() => null);
    return { success: false, error: errMsg };
  }
}

/**
 * Resolves the authoritative merchant(s) for a committed order from database relationships,
 * creates an idempotent in-dashboard notification, and sends a non-blocking SMS alert.
 */
export async function notifyMerchantsForNewOrder(orderId: string): Promise<void> {
  if (!orderId || !pAny.merchantNotification?.findUnique) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, merchant_id: true },
          },
        },
      },
      merchant: {
        include: {
          store: { select: { store_name: true } },
        },
      },
    },
  });

  if (!order) return;

  // Group ordered items by their authoritative owning merchant_id
  const itemsByMerchant = new Map<string, Array<{ name: string; quantity: number }>>();
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      const ownerMerchantId = item.product?.merchant_id || order.merchant_id;
      if (!itemsByMerchant.has(ownerMerchantId)) {
        itemsByMerchant.set(ownerMerchantId, []);
      }
      itemsByMerchant.get(ownerMerchantId)!.push({
        name: item.product_name_snapshot || item.product?.name || order.product_name,
        quantity: Number(item.quantity || 1),
      });
    }
  } else {
    itemsByMerchant.set(order.merchant_id, [
      { name: order.product_name, quantity: 1 },
    ]);
  }

  const frontendOrigin = (config.frontendUrl || 'https://lumotrack.lumo.co.tz').replace(/\/+$/, '');

  for (const [merchantId, mItems] of itemsByMerchant.entries()) {
    const idempotencyKey = `NEW_ORDER:${order.id}:MERCHANT:${merchantId}`;

    // Duplicate prevention: never re-create or re-send for same order + merchant
    const existing = await pAny.merchantNotification.findUnique({
      where: { idempotency_key: idempotencyKey },
    });
    if (existing) {
      continue;
    }

    const targetMerchant =
      merchantId === order.merchant_id
        ? order.merchant
        : await prisma.merchant.findUnique({
            where: { id: merchantId },
            include: { store: { select: { store_name: true } } },
          });

    if (!targetMerchant) continue;

    // Authoritative phone from Merchant record, falling back to primary active MerchantUser
    let recipientPhone = targetMerchant.business_phone?.trim() || '';
    if (!recipientPhone) {
      const primaryUser = await prisma.merchantUser.findFirst({
        where: { merchant_id: merchantId, status: 'ACTIVE' },
        orderBy: { created_at: 'asc' },
        select: { phone: true },
      });
      recipientPhone = primaryUser?.phone?.trim() || '';
    }

    const merchantLabel = targetMerchant.store?.store_name || targetMerchant.business_name || 'Merchant';
    const totalQuantity = mItems.reduce((sum, it) => sum + Number(it.quantity || 1), 0);
    const productSummary =
      mItems.length === 1
        ? mItems[0].name
        : `${mItems[0].name} (+${mItems.length - 1} more)`;
    const actionUrl = `/dashboard/orders/${order.id}`;
    const dashboardUrl = `${frontendOrigin}${actionUrl}`;

    const smsBody = buildMerchantNewOrderSms({
      merchantName: merchantLabel,
      orderNumber: order.order_number,
      productSummary,
      totalQuantity,
      dashboardUrl,
    });

    const title = `New Order #${order.order_number}`;
    const dashboardMessage = `${productSummary} (Qty: ${totalQuantity}) ordered. Review and process in Orders.`;

    const createdNotif = await pAny.merchantNotification.create({
      data: {
        merchant_id: merchantId,
        order_id: order.id,
        notification_type: 'NEW_ORDER',
        title,
        message: dashboardMessage,
        product_summary: `${productSummary} • Qty ${totalQuantity}`,
        action_url: actionUrl,
        sms_status: recipientPhone ? 'PENDING' : 'FAILED',
        delivery_attempts: 0,
        provider_response: recipientPhone ? null : 'Merchant phone number not configured',
        idempotency_key: idempotencyKey,
      },
    });

    let orderNotifId: string | null = null;
    if (recipientPhone && prisma.orderNotification?.findUnique) {
      const existingOrderNotif = await prisma.orderNotification.findUnique({
        where: { idempotency_key: idempotencyKey },
      });
      if (!existingOrderNotif) {
        const createdOrderNotif = await prisma.orderNotification.create({
          data: {
            order_id: order.id,
            event_type: 'ORDER_CREATED',
            recipient_type: 'MERCHANT',
            recipient_phone: recipientPhone,
            message_body: smsBody,
            idempotency_key: idempotencyKey,
            channel: 'SMS',
            status: 'QUEUED',
          },
        });
        orderNotifId = createdOrderNotif.id;
      }
    }

    if (recipientPhone) {
      setImmediate(() => {
        dispatchMerchantNotificationSmsAttempt(
          createdNotif.id,
          orderNotifId,
          recipientPhone,
          smsBody,
          true
        ).catch((err) => {
          console.error('[MERCHANT ORDER SMS DISPATCH ERROR]', err);
        });
      });
    }
  }
}

export async function listMerchantNotifications(
  merchantId: string,
  opts: { page?: number; limit?: number; unreadOnly?: boolean }
) {
  const page = Math.max(1, Number(opts.page || 1));
  const limit = Math.min(50, Math.max(1, Number(opts.limit || 20)));
  const skip = (page - 1) * limit;

  const where: any = { merchant_id: merchantId };
  if (opts.unreadOnly) {
    where.read_at = null;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    pAny.merchantNotification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_selling_amount: true,
            currency: true,
          },
        },
      },
    }),
    pAny.merchantNotification.count({ where }),
    pAny.merchantNotification.count({ where: { merchant_id: merchantId, read_at: null } }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page,
    limit,
  };
}

export async function markMerchantNotificationRead(merchantId: string, notificationId: string) {
  const existing = await pAny.merchantNotification.findFirst({
    where: { id: notificationId, merchant_id: merchantId },
  });
  if (!existing) throw new Error('Notification not found');

  if (existing.read_at) return existing;
  return pAny.merchantNotification.update({
    where: { id: notificationId },
    data: { read_at: new Date() },
  });
}

export async function markAllMerchantNotificationsRead(merchantId: string) {
  const res = await pAny.merchantNotification.updateMany({
    where: { merchant_id: merchantId, read_at: null },
    data: { read_at: new Date() },
  });
  return { updatedCount: res.count };
}

export async function retryFailedMerchantNotificationSms(merchantId: string, notificationId: string) {
  const notif = await pAny.merchantNotification.findFirst({
    where: { id: notificationId, merchant_id: merchantId },
    include: {
      merchant: { include: { store: { select: { store_name: true } } } },
      order: true,
    },
  });
  if (!notif) throw new Error('Notification not found');
  if (notif.sms_status === 'SENT' || notif.sms_status === 'DELIVERED') {
    throw new Error('SMS already sent for this notification');
  }

  let recipientPhone = notif.merchant?.business_phone?.trim() || '';
  if (!recipientPhone) {
    const primaryUser = await prisma.merchantUser.findFirst({
      where: { merchant_id: merchantId, status: 'ACTIVE' },
      orderBy: { created_at: 'asc' },
      select: { phone: true },
    });
    recipientPhone = primaryUser?.phone?.trim() || '';
  }
  if (!recipientPhone) throw new Error('Merchant phone number not configured');

  const frontendOrigin = (config.frontendUrl || 'https://lumotrack.lumo.co.tz').replace(/\/+$/, '');
  const dashboardUrl = `${frontendOrigin}${notif.action_url || `/dashboard/orders/${notif.order_id || ''}`}`;
  const smsBody = notif.order
    ? buildMerchantNewOrderSms({
        merchantName: notif.merchant?.store?.store_name || notif.merchant?.business_name || 'Merchant',
        orderNumber: notif.order.order_number,
        productSummary: notif.product_summary || notif.order.product_name,
        totalQuantity: 1,
        dashboardUrl,
      })
    : notif.message;

  const orderNotif = notif.idempotency_key
    ? await prisma.orderNotification.findUnique({ where: { idempotency_key: notif.idempotency_key } }).catch(() => null)
    : null;

  const res = await dispatchMerchantNotificationSmsAttempt(
    notif.id,
    orderNotif?.id || null,
    recipientPhone,
    smsBody,
    false
  );

  const updated = await pAny.merchantNotification.findUnique({ where: { id: notif.id } });
  return { ...res, notification: updated };
}

