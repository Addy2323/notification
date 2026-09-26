import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../database/prisma';

export async function getCustomerTracking(req: Request, res: Response) {
  try {
    const { token } = req.params;

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

    // Mask driver phone for driver privacy
    const maskedDriverPhone = delivery.driver_phone.slice(0, 7) + '****';

    return sendSuccess(res, {
      status: delivery.status,
      product_description: delivery.product_description,
      delivery_address: delivery.delivery_address,
      created_at: delivery.created_at,
      started_at: delivery.started_at,
      arrived_at: delivery.arrived_at,
      delivered_at: delivery.delivered_at,
      driver: {
        name: delivery.driver_name,
        masked_phone: maskedDriverPhone,
        raw_phone: delivery.driver_phone,
      },
      merchant: delivery.merchant,
      timeline: delivery.events.map((e) => ({
        event_type: e.event_type,
        timestamp: e.timestamp,
      })),
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}
