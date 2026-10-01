import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../database/prisma';

export async function getCustomerTracking(req: Request, res: Response) {
  try {
    const { token } = req.params;

    // First search Order model by tracking_token OR order_number
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { tracking_token: token },
          { order_number: token },
        ],
      },
      include: {
        merchant: {
          select: {
            business_name: true,
            business_phone: true,
            logo_url: true,
            brand_color: true,
            whatsapp_number: true,
          },
        },
        events: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            event_type: true,
            timestamp: true,
          },
        },
      },
    });

    if (order) {
      const maskedDriverPhone = order.driver_phone ? order.driver_phone.slice(0, 7) + '****' : null;

      return sendSuccess(res, {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        product_description: order.product_name,
        delivery_address: order.delivery_address,
        customer_name: order.customer_name,
        created_at: order.created_at,
        confirmed_at: order.confirmed_at,
        out_for_delivery_at: order.out_for_delivery_at,
        arrived_at: order.arrived_at,
        delivered_at: order.delivered_at,
        cancelled_at: order.cancelled_at,
        driver: order.driver_name ? {
          name: order.driver_name,
          masked_phone: maskedDriverPhone,
          raw_phone: order.driver_phone,
        } : null,
        merchant: order.merchant,
        timeline: order.events.map((e: any) => ({
          event_type: e.event_type,
          timestamp: e.timestamp,
        })),
        is_order: true,
      });
    }

    // Fallback search legacy Delivery model by tracking_token
    const delivery = await prisma.delivery.findUnique({
      where: { tracking_token: token },
      include: {
        merchant: {
          select: {
            business_name: true,
            business_phone: true,
            logo_url: true,
            brand_color: true,
            whatsapp_number: true,
          },
        },
        events: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            event_type: true,
            timestamp: true,
          },
        },
      },
    });

    if (!delivery) {
      return sendError(res, 'NOT_FOUND', 'Tracking link invalid or expired.', 404);
    }

    const maskedDriverPhone = delivery.driver_phone ? delivery.driver_phone.slice(0, 7) + '****' : null;

    return sendSuccess(res, {
      id: delivery.id,
      order_number: `DEL-${delivery.id.slice(0, 6).toUpperCase()}`,
      status: delivery.status,
      product_description: delivery.product_description,
      delivery_address: delivery.delivery_address,
      customer_name: 'Customer',
      created_at: delivery.created_at,
      started_at: delivery.started_at,
      arrived_at: delivery.arrived_at,
      delivered_at: delivery.delivered_at,
      driver: delivery.driver_name ? {
        name: delivery.driver_name,
        masked_phone: maskedDriverPhone,
        raw_phone: delivery.driver_phone,
      } : null,
      merchant: delivery.merchant,
      timeline: delivery.events.map((e: any) => ({
        event_type: e.event_type,
        timestamp: e.timestamp,
      })),
      is_order: false,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}
