import { prisma } from '../database/prisma';
import { generateDriverToken, generateTrackingToken } from '../utils/token';
import { dispatchOrderEvent } from '../notifications/orderNotificationEngine';
import { notifyMerchantsForNewOrder } from './merchantNotificationService';
import { triggerOrderReceiptConfirmation } from './receiptConfirmationService';
import {
  triggerConfirmationReceipt,
  syncReceiptFinancialSnapshot,
  formatReceiptSummary,
  normalizePaymentStatus,
} from './confirmationReceiptService';
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
  imageUrl?: string;
  amount?: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  notifyMerchant?: boolean;
  transportType?: string;
  items?: OrderItemInput[];
  deliveryFee?: number;
  discountAmount?: number;
  taxAmount?: number;
  amountPaid?: number;
  paymentStatus?: string;
  currency?: string;
  transactionReference?: string;
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
      unit_cost_price: it.unitCostPrice === undefined ? null : cost,
      quantity: qty,
      discount: disc,
      subtotal,
      profit_amount: it.unitCostPrice === undefined ? null : itemProfit,
    };
  });

  const deliveryFee = Math.max(0, Number(data.deliveryFee || 0));
  const discountAmount = Math.max(0, Number(data.discountAmount || 0));
  const taxAmount = Math.max(0, Number(data.taxAmount || 0));
  const finalAmount = Math.max(0, totalRevenue - discountAmount + deliveryFee + taxAmount);
  const normalizedPayStatus = normalizePaymentStatus(data.paymentStatus, data.amountPaid, finalAmount).replace(/ /g, '_');
  const amountPaid = normalizedPayStatus === 'PAID' && data.amountPaid === undefined
    ? finalAmount
    : Math.max(0, Number(data.amountPaid || 0));
  const orderCurrency = (data.currency || (merchant as any).currency || 'TZS').trim().toUpperCase();

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
        image_url: data.imageUrl || null,
        amount: finalAmount,
        total_revenue: totalRevenue,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        amount_paid: amountPaid,
        payment_status: normalizedPayStatus,
        currency: orderCurrency,
        transaction_reference: data.transactionReference || null,
        total_cost: preparedItems.every(it => it.unit_cost_price !== null) ? totalCost : null,
        gross_profit: preparedItems.every(it => it.unit_cost_price !== null) ? grossProfit : null,
        driver_id: data.driverId || null,
        driver_name: data.driverName || null,
        driver_phone: data.driverPhone || null,
        vehicle_info: data.vehicleInfo || data.transportType || 'BODA',
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
      vehicleInfo: data.vehicleInfo || data.transportType || 'BODA',
    },
  });

  if (data.notifyMerchant) {
    notifyMerchantsForNewOrder(order.id).catch((err) => {
      console.error('[MERCHANT ORDER NOTIFICATION ERROR]', err);
    });
  }

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
    if (options.status === 'REFUNDED') where.payment_status = 'REFUNDED';
    else where.status = options.status;
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
        driver: { select: { id: true, name: true, phone: true, status: true, vehicle_info: true } },
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
      items: true,
      events: { orderBy: { timestamp: 'asc' } },
      notifications: { orderBy: { created_at: 'desc' } },
      confirmation_receipt: true,
      merchant: {
        select: {
          business_name: true,
          logo_url: true,
          brand_color: true,
          business_phone: true,
          email: true,
          location: true,
          website: true,
        },
      },
    },
  });

  if (!order) throw new Error('Order not found');

  return {
    ...order,
    tracking_url: order.tracking_token ? `${config.frontendUrl}/track/${order.tracking_token}` : null,
    driver_url: order.driver_token ? `${config.frontendUrl}/driver/${order.driver_token}` : null,
    confirmation_receipt: (order as any).confirmation_receipt
      ? formatReceiptSummary((order as any).confirmation_receipt)
      : null,
  };
}

export async function updateOrderStatus(
  merchantId: string,
  userId: string,
  orderId: string,
  newStatus: string,
  options?: { isAdmin?: boolean }
) {
  const order = await prisma.order.findFirst({
    where: options?.isAdmin ? { id: orderId } : { id: orderId, merchant_id: merchantId },
    include: { merchant: true, driver: true, confirmation_receipt: true },
  });

  if (!order) throw new Error('Order not found');

  // Idempotent repeat completion check: never duplicate receipt or automatic SMS
  if (order.status === 'COMPLETED' && newStatus === 'COMPLETED') {
    let receipt = (order as any).confirmation_receipt;
    if (!receipt || receipt.status !== 'GENERATED') {
      try {
        receipt = await triggerConfirmationReceipt(order.id, { triggeredBy: userId, syncSms: true });
      } catch (err) {
        console.error('[ORDER COMPLETED RECEIPT IDEMPOTENT ERROR]', err);
      }
    }
    return {
      ...order,
      confirmation_receipt: receipt ? formatReceiptSummary(receipt) : null,
    };
  }

  // Validate transitions
  const validTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    CONFIRMED: ['DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    DRIVER_ASSIGNED: ['OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['ARRIVED', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    ARRIVED: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
    DELIVERED: ['COMPLETED'],
  };

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  const now = new Date();
  const updateData: any = { status: newStatus };
  let ratingToken = (order as any).rating_token;

  if (newStatus === 'CONFIRMED') updateData.confirmed_at = now;
  if (newStatus === 'OUT_FOR_DELIVERY') updateData.out_for_delivery_at = now;
  if (newStatus === 'ARRIVED') updateData.arrived_at = now;
  if (newStatus === 'DELIVERED') {
    updateData.delivered_at = now;
    if (!ratingToken) {
      ratingToken = crypto.randomBytes(16).toString('hex');
      updateData.rating_token = ratingToken;
    }
  }
  if (newStatus === 'COMPLETED') {
    updateData.completed_at = order.completed_at || now;
    if (!ratingToken) {
      ratingToken = crypto.randomBytes(16).toString('hex');
      updateData.rating_token = ratingToken;
    }
  }
  if (newStatus === 'CANCELLED') updateData.cancelled_at = now;

  // Map status to event type
  const eventTypeMap: Record<string, string> = {
    CONFIRMED: 'ORDER_CONFIRMED',
    DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    ARRIVED: 'DRIVER_ARRIVED',
    DELIVERED: 'ORDER_DELIVERED',
    COMPLETED: 'ORDER_COMPLETED',
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
        actor_type: options?.isAdmin ? 'ADMIN' : 'MERCHANT',
        actor_reference: userId,
      },
    });

    // If delivered or completed, update driver status to AVAILABLE
    if ((newStatus === 'DELIVERED' || newStatus === 'COMPLETED') && order.driver_id) {
      await tx.driver.update({
        where: { id: order.driver_id },
        data: { status: 'AVAILABLE' },
      });
    }

    return updated;
  });

  // For standard statuses other than COMPLETED, dispatch order tracking SMS.
  // For COMPLETED, ONLY the approved confirmation receipt SMS is sent.
  if (newStatus !== 'COMPLETED') {
    const merchantName = order.merchant.business_name || 'LUMO';
    const trackingUrl = order.tracking_token ? `${config.frontendUrl}/track/${order.tracking_token}` : '';
    const driverUrl = order.driver_token ? `${config.frontendUrl}/driver/${order.driver_token}` : '';
    const ratingUrl = ratingToken ? `${config.frontendUrl}/rate/${ratingToken}` : '';

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
        ratingUrl,
        vehicleInfo: order.vehicle_info || order.driver?.vehicle_info || 'BODA',
      },
    });
  }

  // Automatically trigger interactive confirmation request if delivered
  if (newStatus === 'DELIVERED') {
    triggerOrderReceiptConfirmation(order.id).catch((err) => {
      console.error('[ORDER DELIVERED RECEIPT CONFIRMATION ERROR]', err);
    });
  }

  // Automatically generate PDF Confirmation Receipt & send approved SMS on COMPLETED or DELIVERED
  let generatedReceipt: any = null;
  if (newStatus === 'COMPLETED') {
    try {
      generatedReceipt = await triggerConfirmationReceipt(order.id, {
        triggeredBy: userId,
        syncSms: true,
      });
    } catch (err) {
      console.error('[ORDER COMPLETED CONFIRMATION RECEIPT ERROR]', err);
    }
  } else if (newStatus === 'DELIVERED') {
    triggerConfirmationReceipt(order.id, { triggeredBy: userId }).catch((err) => {
      console.error('[ORDER DELIVERED CONFIRMATION RECEIPT ERROR]', err);
    });
  }

  return {
    ...result,
    confirmation_receipt: generatedReceipt ? formatReceiptSummary(generatedReceipt) : null,
  };
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
        vehicle_info: driver.vehicle_info || order.vehicle_info || 'BODA',
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
      vehicleInfo: driver.vehicle_info || order.vehicle_info || 'BODA',
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

// A conditional update ensures concurrent/repeated requests cannot refund twice.
export async function refundOrder(merchantId: string, userId: string, orderId: string, input: { reason: string; restocked: boolean; updatedAt?: string }) {
  const updatedOrder = await prisma.$transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id: orderId, merchant_id: merchantId } });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') throw new Error('Only delivered or completed orders can be refunded');
    if (input.updatedAt && new Date(input.updatedAt).getTime() !== order.updated_at.getTime()) throw new Error('This order changed. Close and reopen the refund form to review it.');
    const changed = await tx.order.updateMany({ where: { id: orderId, merchant_id: merchantId, status: order.status, updated_at: order.updated_at, payment_status: { not: 'REFUNDED' } }, data: { payment_status: 'REFUNDED' } });
    if (changed.count !== 1) throw new Error('This order has already been refunded or changed. Refresh and review it.');
    await tx.orderEvent.create({ data: { order_id: orderId, event_type: 'ORDER_REFUNDED', actor_type: 'MERCHANT', actor_reference: userId, metadata: JSON.stringify({ reason: input.reason, restocked: input.restocked, amount: Number(order.total_revenue ?? order.amount ?? 0) }) } });
    return tx.order.findUnique({ where: { id: orderId } });
  });
  Promise.resolve(syncReceiptFinancialSnapshot(orderId)).catch(() => {});
  return updatedOrder;
}

export async function updateOrderPaymentStatus(
  merchantId: string,
  userId: string,
  orderId: string,
  input: {
    paymentStatus?: string;
    amountPaid?: number;
    transactionReference?: string | null;
    deliveryFee?: number;
    discountAmount?: number;
    taxAmount?: number;
  },
  options?: { isAdmin?: boolean }
) {
  const updatedOrder = await prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findFirst({
      where: options?.isAdmin ? { id: orderId } : { id: orderId, merchant_id: merchantId },
      include: { items: true },
    });
    if (!order) throw new Error('Order not found');

    const deliveryFee =
      input.deliveryFee !== undefined ? Math.max(0, Number(input.deliveryFee)) : Number(order.delivery_fee ?? 0);
    const discountAmount =
      input.discountAmount !== undefined ? Math.max(0, Number(input.discountAmount)) : Number(order.discount_amount ?? 0);
    const taxAmount =
      input.taxAmount !== undefined ? Math.max(0, Number(input.taxAmount)) : Number(order.tax_amount ?? 0);

    const itemsSubtotal =
      order.total_revenue !== null && order.total_revenue !== undefined
        ? Number(order.total_revenue)
        : order.items && order.items.length > 0
          ? order.items.reduce((acc: number, it: any) => acc + Number(it.subtotal || 0), 0)
          : Number(order.amount || 0);

    const feesEdited =
      input.deliveryFee !== undefined || input.discountAmount !== undefined || input.taxAmount !== undefined;
    const grandTotal = feesEdited
      ? Math.max(0, itemsSubtotal - discountAmount + deliveryFee + taxAmount)
      : Number(order.amount || itemsSubtotal);

    let nextAmountPaid =
      input.amountPaid !== undefined ? Math.max(0, Number(input.amountPaid)) : Number(order.amount_paid ?? 0);

    const requested = input.paymentStatus
      ? String(input.paymentStatus).toUpperCase().trim().replace(/\s+/g, '_')
      : undefined;

    if (requested === 'PAID' && input.amountPaid === undefined) {
      nextAmountPaid = grandTotal;
    } else if (requested === 'UNPAID' && input.amountPaid === undefined) {
      nextAmountPaid = 0;
    }

    const dbPaymentStatus =
      requested === 'REFUNDED' || requested === 'PAID' || requested === 'PARTIALLY_PAID' || requested === 'UNPAID'
        ? requested
        : normalizePaymentStatus(requested, nextAmountPaid, grandTotal).replace(/ /g, '_');

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        amount: grandTotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        amount_paid: nextAmountPaid,
        payment_status: dbPaymentStatus,
        transaction_reference:
          input.transactionReference !== undefined
            ? input.transactionReference || null
            : order.transaction_reference,
      },
    });

    await tx.orderEvent.create({
      data: {
        order_id: order.id,
        event_type: 'ORDER_PAYMENT_UPDATED',
        actor_type: options?.isAdmin ? 'ADMIN' : 'MERCHANT',
        actor_reference: userId,
        metadata: JSON.stringify({
          payment_status: dbPaymentStatus,
          amount_paid: nextAmountPaid,
          grand_total: grandTotal,
          transaction_reference: updated.transaction_reference,
        }),
      },
    });

    return updated;
  });

  const receipt = await syncReceiptFinancialSnapshot(orderId).catch(() => null);
  return {
    ...updatedOrder,
    confirmation_receipt: receipt ? formatReceiptSummary(receipt) : null,
  };
}
