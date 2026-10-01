import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../database/prisma';
import { dispatchOrderEvent } from '../notifications/orderNotificationEngine';
import { config } from '../config';

export async function getDriverDelivery(req: Request, res: Response) {
  try {
    const { token } = req.params;

    // First check Order model
    const order = await prisma.order.findUnique({
      where: { driver_token: token },
      include: {
        merchant: {
          select: {
            business_name: true,
            logo_url: true,
            brand_color: true,
            business_phone: true,
            whatsapp_number: true,
          },
        },
      },
    });

    if (order) {
      return sendSuccess(res, {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        product_description: order.product_name,
        delivery_address: order.delivery_address,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        driver_name: order.driver_name,
        merchant: order.merchant,
        created_at: order.created_at,
        is_order: true,
      });
    }

    // Fallback check legacy Delivery model
    const delivery = await prisma.delivery.findUnique({
      where: { driver_token: token },
      include: {
        merchant: {
          select: {
            business_name: true,
            logo_url: true,
            brand_color: true,
            business_phone: true,
            whatsapp_number: true,
          },
        },
      },
    });

    if (!delivery) {
      return sendError(res, 'INVALID_TOKEN', 'This driver delivery link is invalid or expired.', 404);
    }

    return sendSuccess(res, {
      id: delivery.id,
      order_number: `DEL-${delivery.id.slice(0, 6).toUpperCase()}`,
      status: delivery.status,
      product_description: delivery.product_description,
      delivery_address: delivery.delivery_address,
      customer_name: 'Customer',
      customer_phone: delivery.customer_phone,
      driver_name: delivery.driver_name,
      merchant: delivery.merchant,
      created_at: delivery.created_at,
      is_order: false,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

async function handleOrderDriverAction(token: string, action: 'accept' | 'start' | 'nearby' | 'delivered' | 'failed') {
  const order = await prisma.order.findUnique({
    where: { driver_token: token },
    include: { merchant: true },
  });

  if (!order) return null;

  const statusMap: Record<string, string> = {
    accept: 'CONFIRMED',
    start: 'OUT_FOR_DELIVERY',
    nearby: 'ARRIVED',
    delivered: 'DELIVERED',
    failed: 'CANCELLED',
  };

  const eventMap: Record<string, string> = {
    accept: 'ORDER_CONFIRMED',
    start: 'OUT_FOR_DELIVERY',
    nearby: 'DRIVER_ARRIVED',
    delivered: 'ORDER_DELIVERED',
    failed: 'ORDER_CANCELLED',
  };

  const newStatus = statusMap[action];
  const eventType = eventMap[action];
  const now = new Date();

  const updateData: any = { status: newStatus };
  if (action === 'accept') updateData.confirmed_at = now;
  if (action === 'start') updateData.out_for_delivery_at = now;
  if (action === 'nearby') updateData.arrived_at = now;
  if (action === 'delivered') updateData.delivered_at = now;
  if (action === 'failed') updateData.cancelled_at = now;

  const updatedOrder = await prisma.$transaction(async (tx: any) => {
    const res = await tx.order.update({
      where: { id: order.id },
      data: updateData,
    });

    await tx.orderEvent.create({
      data: {
        order_id: order.id,
        event_type: eventType,
        actor_type: 'DRIVER',
        actor_reference: order.driver_name || 'Driver',
      },
    });

    if (action === 'delivered' && order.driver_id) {
      await tx.driver.update({
        where: { id: order.driver_id },
        data: { status: 'AVAILABLE' },
      });
    }

    return res;
  });

  // Automatically dispatch SMS notification to Customer
  const merchantName = order.merchant.business_name || 'LUMO';
  const trackingUrl = order.tracking_token ? `${config.frontendUrl}/track/${order.tracking_token}` : '';
  const driverUrl = order.driver_token ? `${config.frontendUrl}/driver/${order.driver_token}` : '';

  await dispatchOrderEvent({
    orderId: order.id,
    eventType,
    customerPhone: order.customer_phone,
    vars: {
      merchantName,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      orderNumber: order.order_number,
      orderStatus: newStatus,
      driverName: order.driver_name || 'Driver',
      driverPhone: order.driver_phone || '',
      deliveryAddress: order.delivery_address,
      trackingUrl,
      driverUrl,
    },
  });

  return updatedOrder;
}

export async function acceptDelivery(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const order = await handleOrderDriverAction(token, 'accept');
    if (order) return sendSuccess(res, { order });

    return sendError(res, 'NOT_FOUND', 'Order not found', 404);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function startDelivery(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const order = await handleOrderDriverAction(token, 'start');
    if (order) return sendSuccess(res, { order });

    return sendError(res, 'NOT_FOUND', 'Order not found', 404);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function markNearby(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const order = await handleOrderDriverAction(token, 'nearby');
    if (order) return sendSuccess(res, { order });

    return sendError(res, 'NOT_FOUND', 'Order not found', 404);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function confirmDelivered(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const order = await handleOrderDriverAction(token, 'delivered');
    if (order) return sendSuccess(res, { order });

    return sendError(res, 'NOT_FOUND', 'Order not found', 404);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function markFailed(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const order = await handleOrderDriverAction(token, 'failed');
    if (order) return sendSuccess(res, { order });

    return sendError(res, 'NOT_FOUND', 'Order not found', 404);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}
