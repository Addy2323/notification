import { prisma } from '../database/prisma';
import { generateDriverToken, generateTrackingToken } from '../utils/token';
import { dispatchOrderEvent } from '../notifications/orderNotificationEngine';
import { config } from '../config';
import crypto from 'crypto';

function generateOrderNumber(): string {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `LUMO-${num}`;
}

export interface OrderItemInput {
  productId?: string;
  productName: string;
  description?: string;
  sku?: string;
  category?: string;
  unitSellingPrice: number;
  unitCostPrice?: number;
  quantity?: number;
  discount?: number;
}

export interface CreateOrderDTO {
  merchantId: string;
  userId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  productName: string;
  amount?: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  items?: OrderItemInput[];
}

export async function createOrder(data: CreateOrderDTO) {
  const merchant = await prisma.merchant.findUnique({ where: { id: data.merchantId } });
  if (!merchant) throw new Error('Merchant not found');

  const orderNumber = generateOrderNumber();
  const trackingToken = generateTrackingToken();
  const trackingUrl = `${config.frontendUrl}/track/${trackingToken}`;

  let driverToken: string | null = null;
  let driverUrl = '';
  let initialStatus = 'PENDING';

  if (data.driverId && data.driverName && data.driverPhone) {
    driverToken = generateDriverToken();
    driverUrl = `${config.frontendUrl}/driver/${driverToken}`;
  }

  // Auto-create/upsert customer record
  let customerId = data.customerId || null;
  if (!customerId) {
    const customer = await prisma.customer.upsert({
      where: { merchant_id_phone: { merchant_id: data.merchantId, phone: data.customerPhone } },
      create: {
        merchant_id: data.merchantId,
        name: data.customerName,
        phone: data.customerPhone,
        delivery_address: data.deliveryAddress,
      },
      update: {
        name: data.customerName,
        delivery_address: data.deliveryAddress,
      },
    });
    customerId = customer.id;
  }

  // Calculate Order Items & Financial Totals
  const rawItems = data.items && data.items.length > 0
    ? data.items
    : [
        {
          productName: data.productName,
          unitSellingPrice: data.amount || 0,
          quantity: 1,
        },
      ];

  let totalRevenue = 0;
  let totalCost = 0;
  let grossProfit = 0;

  const preparedItems = rawItems.map((it) => {
    const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
    const price = it.unitSellingPrice || 0;
    const cost = it.unitCostPrice || 0;
    const disc = it.discount || 0;
    const subtotal = price * qty - disc;
    const itemProfit = cost > 0 ? subtotal - cost * qty : subtotal;

    totalRevenue += subtotal;
    totalCost += cost * qty;
    grossProfit += itemProfit;

    return {
      product_id: it.productId || null,
      product_name_snapshot: it.productName,
      product_description_snapshot: it.description || null,
      product_sku_snapshot: it.sku || null,
      product_category_snapshot: it.category || null,
      unit_selling_price: price,
      unit_cost_price: cost > 0 ? cost : null,
      quantity: qty,
      discount: disc,
      subtotal,
      profit_amount: cost > 0 ? itemProfit : null,
    };
  });

  const finalAmount = data.amount !== undefined && data.amount !== null ? data.amount : totalRevenue;

  const order = await prisma.$transaction(async (tx: any) => {
    const newOrder = await tx.order.create({
      data: {
        order_number: orderNumber,
        merchant_id: data.merchantId,
        customer_id: customerId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        delivery_address: data.deliveryAddress,
        product_name: data.productName,
        amount: finalAmount,
        total_revenue: totalRevenue,
        total_cost: totalCost > 0 ? totalCost : null,
        gross_profit: totalCost > 0 ? grossProfit : totalRevenue,
        driver_id: data.driverId || null,
        driver_name: data.driverName || null,
        driver_phone: data.driverPhone || null,
        status: initialStatus,
        tracking_token: trackingToken,
        driver_token: driverToken,
        items: {
          create: preparedItems,
        },
      },
      include: {
        items: true,
      },
    });

    await tx.orderEvent.create({
      data: {
        order_id: newOrder.id,
        event_type: 'ORDER_CREATED',
        actor_type: 'MERCHANT',
        actor_reference: data.userId,
        metadata: JSON.stringify({ product: data.productName, customer: data.customerName, revenue: totalRevenue }),
      },
    });

    return newOrder;
  });

  // Dispatch ORDER_CREATED SMS
  const merchantName = merchant.business_name || 'LUMO';
  await dispatchOrderEvent({
    orderId: order.id,
    eventType: 'ORDER_CREATED',
    customerPhone: data.customerPhone,
    vars: {
      merchantName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      orderNumber,
      orderStatus: 'Pending',
      driverName: data.driverName || '',
      driverPhone: data.driverPhone || '',
      deliveryAddress: data.deliveryAddress,
      trackingUrl,
      driverUrl,
    },
  });

  return {
    order,
    tracking_url: trackingUrl,
    driver_url: driverUrl,
  };
}

export async function listOrders(merchantId: string, options: {
  search?: string;
  status?: string;
  driverId?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;
  const where: any = { merchant_id: merchantId };

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.driverId) {
    where.driver_id = options.driverId;
  }

  if (options.search) {
    const s = options.search.trim();
    where.OR = [
      { order_number: { contains: s, mode: 'insensitive' } },
      { customer_name: { contains: s, mode: 'insensitive' } },
      { customer_phone: { contains: s } },
      { product_name: { contains: s, mode: 'insensitive' } },
      { driver_name: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true, status: true } },
      },
    }),
  ]);

  return {
    orders,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getOrderDetail(merchantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchant_id: merchantId },
    include: {
      customer: true,
      driver: true,
      events: { orderBy: { timestamp: 'asc' } },
      notifications: { orderBy: { created_at: 'desc' } },
      merchant: { select: { business_name: true, logo_url: true, brand_color: true } },
    },
  });

  if (!order) throw new Error('Order not found');

  return {
    ...order,
    tracking_url: order.tracking_token ? `${config.frontendUrl}/track/${order.tracking_token}` : null,
    driver_url: order.driver_token ? `${config.frontendUrl}/driver/${order.driver_token}` : null,
  };
}

export async function updateOrderStatus(
  merchantId: string,
  userId: string,
  orderId: string,
  newStatus: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchant_id: merchantId },
    include: { merchant: true, driver: true },
  });

  if (!order) throw new Error('Order not found');

  // Validate transitions
  const validTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
    CONFIRMED: ['DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
    DRIVER_ASSIGNED: ['OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['ARRIVED', 'DELIVERED', 'CANCELLED'],
    ARRIVED: ['DELIVERED', 'CANCELLED'],
  };

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  const now = new Date();
  const updateData: any = { status: newStatus };

  if (newStatus === 'CONFIRMED') updateData.confirmed_at = now;
  if (newStatus === 'OUT_FOR_DELIVERY') updateData.out_for_delivery_at = now;
  if (newStatus === 'ARRIVED') updateData.arrived_at = now;
  if (newStatus === 'DELIVERED') updateData.delivered_at = now;
  if (newStatus === 'CANCELLED') updateData.cancelled_at = now;

  // Map status to event type
  const eventTypeMap: Record<string, string> = {
    CONFIRMED: 'ORDER_CONFIRMED',
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    ARRIVED: 'DRIVER_ARRIVED',
    DELIVERED: 'ORDER_DELIVERED',
    CANCELLED: 'ORDER_CANCELLED',
  };

  const eventType = eventTypeMap[newStatus];

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: updateData,
    });

    await tx.orderEvent.create({
      data: {
        order_id: order.id,
        event_type: eventType,
        actor_type: 'MERCHANT',
        actor_reference: userId,
      },
    });

    // If delivered, update driver status to AVAILABLE
    if (newStatus === 'DELIVERED' && order.driver_id) {
      await tx.driver.update({
        where: { id: order.driver_id },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  });

  // Dispatch notifications
  const merchantName = order.merchant.business_name || 'LUMO';
  const trackingUrl = order.tracking_token ? `${config.frontendUrl}/track/${order.tracking_token}` : '';
  const driverUrl = order.driver_token ? `${config.frontendUrl}/driver/${order.driver_token}` : '';

  await dispatchOrderEvent({
    orderId: order.id,
    eventType,
    customerPhone: order.customer_phone,
    driverPhone: order.driver_phone || undefined,
    vars: {
      merchantName,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      orderNumber: order.order_number,
      orderStatus: newStatus,
      driverName: order.driver_name || '',
      driverPhone: order.driver_phone || '',
      deliveryAddress: order.delivery_address,
      trackingUrl,
      driverUrl,
    },
  });

  return result;
}

export async function assignDriver(
  merchantId: string,
  userId: string,
  orderId: string,
  driverId: string,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchant_id: merchantId },
    include: { merchant: true },
  });

  if (!order) throw new Error('Order not found');

  const driver = await prisma.driver.findFirst({
    where: { id: driverId, merchant_id: merchantId },
  });

  if (!driver) throw new Error('Driver not found');

  // Generate driver token if not already present
  let driverToken = order.driver_token;
  if (!driverToken) {
    driverToken = generateDriverToken();
  }

  const driverUrl = `${config.frontendUrl}/driver/${driverToken}`;
  const trackingUrl = order.tracking_token ? `${config.frontendUrl}/track/${order.tracking_token}` : '';

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        driver_id: driver.id,
        driver_name: driver.name,
        driver_phone: driver.phone,
        driver_token: driverToken,
        status: 'DRIVER_ASSIGNED',
        assigned_at: new Date(),
      },
    });

    await tx.orderEvent.create({
      data: {
        order_id: order.id,
        event_type: 'DRIVER_ASSIGNED',
        actor_type: 'MERCHANT',
        actor_reference: userId,
        metadata: JSON.stringify({ driver_name: driver.name, driver_phone: driver.phone }),
      },
    });

    await tx.driver.update({
      where: { id: driver.id },
      data: { status: 'ON_DELIVERY' },
    });

    return updated;
  });

  // Dispatch both customer & driver notifications
  const merchantName = order.merchant.business_name || 'LUMO';

  await dispatchOrderEvent({
    orderId: order.id,
    eventType: 'DRIVER_ASSIGNED',
    customerPhone: order.customer_phone,
    driverPhone: driver.phone,
    vars: {
      merchantName,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      orderNumber: order.order_number,
      orderStatus: 'Driver Assigned',
      driverName: driver.name,
      driverPhone: driver.phone,
      deliveryAddress: order.delivery_address,
      trackingUrl,
      driverUrl,
    },
  });

  return { order: result, driver_url: driverUrl };
}

export async function getOrderMetrics(merchantId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [total, pending, confirmed, assigned, outForDelivery, delivered, cancelled] = await Promise.all([
    prisma.order.count({ where: { merchant_id: merchantId, created_at: { gte: todayStart } } }),
    prisma.order.count({ where: { merchant_id: merchantId, status: 'PENDING' } }),
    prisma.order.count({ where: { merchant_id: merchantId, status: 'CONFIRMED' } }),
    prisma.order.count({ where: { merchant_id: merchantId, status: 'DRIVER_ASSIGNED' } }),
    prisma.order.count({ where: { merchant_id: merchantId, status: 'OUT_FOR_DELIVERY' } }),
    prisma.order.count({ where: { merchant_id: merchantId, status: 'DELIVERED' } }),
    prisma.order.count({ where: { merchant_id: merchantId, status: 'CANCELLED' } }),
  ]);

  return { total, pending, confirmed, assigned, outForDelivery, delivered, cancelled };
}
