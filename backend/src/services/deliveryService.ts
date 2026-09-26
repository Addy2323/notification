import { prisma } from '../database/prisma';
import { generateDriverToken, generateTrackingToken } from '../utils/token';
import { notificationService } from '../notifications/adapter';
import { config } from '../config';

export interface CreateDeliveryDTO {
  merchantId: string;
  userId: string;
  customerPhone: string;
  deliveryAddress: string;
  productDescription: string;
  driverName: string;
  driverPhone: string;
}

export async function createDelivery(data: CreateDeliveryDTO) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: data.merchantId },
  });

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  const trackingToken = generateTrackingToken();
  const driverToken = generateDriverToken();

  const trackingUrl = `${config.frontendUrl}/track/${trackingToken}`;
  const driverUrl = `${config.frontendUrl}/driver/${driverToken}`;

  // Execute in transaction
  const delivery = await prisma.$transaction(async (tx) => {
    const newDelivery = await tx.delivery.create({
      data: {
        merchant_id: data.merchantId,
        customer_phone: data.customerPhone,
        delivery_address: data.deliveryAddress,
        product_description: data.productDescription,
        driver_name: data.driverName,
        driver_phone: data.driverPhone,
        status: 'CREATED',
        tracking_token: trackingToken,
        driver_token: driverToken,
      },
    });

    const event = await tx.deliveryEvent.create({
      data: {
        delivery_id: newDelivery.id,
        event_type: 'DELIVERY_CREATED',
        actor_type: 'MERCHANT',
        actor_reference: data.userId,
        metadata: JSON.stringify({
          driver_name: data.driverName,
          customer_phone: data.customerPhone,
        }),
      },
    });

    return { newDelivery, event };
  });

  // Async dispatch customer SMS
  await notificationService.dispatchNotification({
    deliveryId: delivery.newDelivery.id,
    eventId: delivery.event.id,
    eventType: 'DELIVERY_CREATED',
    recipient: data.customerPhone,
    merchantName: merchant.business_name,
    productName: data.productDescription,
    driverName: data.driverName,
    trackingUrl,
  });

  // Async dispatch driver assignment SMS
  await notificationService.dispatchNotification({
    deliveryId: delivery.newDelivery.id,
    eventId: delivery.event.id,
    eventType: 'DRIVER_ASSIGNED',
    recipient: data.driverPhone,
    merchantName: merchant.business_name,
    productName: data.productDescription,
    driverName: data.driverName,
    businessLocation: merchant.location || '',
    trackingUrl: driverUrl,
  });

  return {
    delivery: delivery.newDelivery,
    tracking_url: trackingUrl,
    driver_url: driverUrl,
  };
}

export async function getMerchantDeliveries(merchantId: string, options: { search?: string; status?: string; page?: number; limit?: number }) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { merchant_id: merchantId };

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.search) {
    const s = options.search.trim();
    where.OR = [
      { tracking_token: { contains: s } },
      { customer_phone: { contains: s } },
      { product_description: { contains: s } },
      { driver_name: { contains: s } },
    ];
  }

  const [total, deliveries] = await Promise.all([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        events: {
          orderBy: { timestamp: 'asc' },
        },
      },
    }),
  ]);

  return {
    deliveries,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDeliveryDetail(merchantId: string, deliveryId: string) {
  const delivery = await prisma.delivery.findFirst({
    where: { id: deliveryId, merchant_id: merchantId },
    include: {
      events: { orderBy: { timestamp: 'asc' } },
      notifications: { orderBy: { sent_at: 'desc' } },
      merchant: { select: { business_name: true, logo_url: true, brand_color: true } },
    },
  });

  if (!delivery) {
    throw new Error('Delivery not found');
  }

  return {
    ...delivery,
    tracking_url: `${config.frontendUrl}/track/${delivery.tracking_token}`,
    driver_url: `${config.frontendUrl}/driver/${delivery.driver_token}`,
  };
}

/**
 * Driver action handler with state validation & idempotency
 */
export async function updateDriverState(driverToken: string, targetState: 'ON_THE_WAY' | 'ARRIVED' | 'DELIVERED', ipAddress?: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { driver_token: driverToken },
    include: { merchant: true },
  });

  if (!delivery) {
    throw new Error('INVALID_TOKEN');
  }

  if (delivery.status === 'CANCELLED') {
    throw new Error('DELIVERY_CANCELLED');
  }

  if (delivery.status === 'FAILED') {
    throw new Error('DELIVERY_FAILED');
  }

  // Idempotency check: if delivery is already in targetState, return current state without error
  if (delivery.status === targetState) {
    return {
      delivery,
      status: delivery.status,
      message: 'Status already up to date',
      idempotent: true,
    };
  }

  // Validate allowed state transitions
  const validTransitions: Record<string, string> = {
    CREATED: 'ON_THE_WAY',
    ON_THE_WAY: 'ARRIVED',
    ARRIVED: 'DELIVERED',
  };

  if (validTransitions[delivery.status] !== targetState) {
    throw new Error(`INVALID_TRANSITION: Cannot transition from ${delivery.status} to ${targetState}`);
  }

  const now = new Date();
  const updateData: any = { status: targetState };
  let eventType = targetState;

  if (targetState === 'ON_THE_WAY') updateData.started_at = now;
  if (targetState === 'ARRIVED') updateData.arrived_at = now;
  if (targetState === 'DELIVERED') updateData.delivered_at = now;

  // Execute transactionally
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: updateData,
    });

    const event = await tx.deliveryEvent.create({
      data: {
        delivery_id: delivery.id,
        event_type: eventType,
        actor_type: 'DRIVER',
        actor_reference: delivery.driver_name,
        ip_address: ipAddress,
      },
    });

    return { updated, event };
  });

  const trackingUrl = `${config.frontendUrl}/track/${delivery.tracking_token}`;

  // Async trigger customer notification
  await notificationService.dispatchNotification({
    deliveryId: delivery.id,
    eventId: result.event.id,
    eventType: targetState,
    recipient: delivery.customer_phone,
    merchantName: delivery.merchant.business_name,
    productName: delivery.product_description,
    driverName: delivery.driver_name,
    trackingUrl,
  });

  return {
    delivery: result.updated,
    status: result.updated.status,
    idempotent: false,
  };
}

export async function cancelDelivery(merchantId: string, userId: string, deliveryId: string) {
  const delivery = await prisma.delivery.findFirst({
    where: { id: deliveryId, merchant_id: merchantId },
    include: { merchant: true },
  });

  if (!delivery) {
    throw new Error('Delivery not found');
  }

  if (delivery.status === 'DELIVERED') {
    throw new Error('Completed deliveries cannot be cancelled.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: { status: 'CANCELLED' },
    });

    const event = await tx.deliveryEvent.create({
      data: {
        delivery_id: delivery.id,
        event_type: 'DELIVERY_CANCELLED',
        actor_type: 'MERCHANT',
        actor_reference: userId,
      },
    });

    return { updated, event };
  });

  // Notify customer
  const trackingUrl = `${config.frontendUrl}/track/${delivery.tracking_token}`;
  await notificationService.dispatchNotification({
    deliveryId: delivery.id,
    eventId: result.event.id,
    eventType: 'DELIVERY_CANCELLED',
    recipient: delivery.customer_phone,
    merchantName: delivery.merchant.business_name,
    productName: delivery.product_description,
    trackingUrl,
  });

  return result.updated;
}

export async function replaceDriver(merchantId: string, userId: string, deliveryId: string, newDriverName: string, newDriverPhone: string) {
  const delivery = await prisma.delivery.findFirst({
    where: { id: deliveryId, merchant_id: merchantId },
  });

  if (!delivery) {
    throw new Error('Delivery not found');
  }

  const newDriverToken = generateDriverToken();

  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: {
      driver_name: newDriverName,
      driver_phone: newDriverPhone,
      driver_token: newDriverToken,
    },
  });

  await prisma.deliveryEvent.create({
    data: {
      delivery_id: delivery.id,
      event_type: 'DRIVER_REPLACED',
      actor_type: 'MERCHANT',
      actor_reference: userId,
      metadata: JSON.stringify({ new_driver_name: newDriverName, new_driver_phone: newDriverPhone }),
    },
  });

  return {
    delivery: updated,
    driver_url: `${config.frontendUrl}/driver/${newDriverToken}`,
  };
}

export async function getMerchantMetrics(merchantId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [deliveriesToday, onTheWay, arrived, delivered, failed] = await Promise.all([
    prisma.delivery.count({
      where: { merchant_id: merchantId, created_at: { gte: todayStart } },
    }),
    prisma.delivery.count({
      where: { merchant_id: merchantId, status: 'ON_THE_WAY' },
    }),
    prisma.delivery.count({
      where: { merchant_id: merchantId, status: 'ARRIVED' },
    }),
    prisma.delivery.count({
      where: { merchant_id: merchantId, status: 'DELIVERED' },
    }),
    prisma.delivery.count({
      where: { merchant_id: merchantId, status: { in: ['CANCELLED', 'FAILED'] } },
    }),
  ]);

  return {
    deliveriesToday,
    onTheWay,
    arrived,
    delivered,
    failed,
  };
}
