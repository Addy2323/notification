import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import * as deliveryService from '../services/deliveryService';
import { prisma } from '../database/prisma';

export async function getDriverDelivery(req: Request, res: Response) {
  try {
    const { token } = req.params;
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
      return sendError(res, 'INVALID_TOKEN', 'This driver delivery link is invalid or expired.', 444);
    }

    // Mask customer phone for driver privacy
    const maskedPhone = delivery.customer_phone.slice(0, 7) + '****';

    return sendSuccess(res, {
      id: delivery.id,
      status: delivery.status,
      product_description: delivery.product_description,
      delivery_address: delivery.delivery_address,
      driver_name: delivery.driver_name,
      customer_masked_phone: maskedPhone,
      customer_raw_phone: delivery.customer_phone,
      merchant: delivery.merchant,
      created_at: delivery.created_at,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function startDelivery(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const ip = req.ip || req.headers['x-forwarded-for'] as string;
    const result = await deliveryService.updateDriverState(token, 'ON_THE_WAY', ip);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function markArrived(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const ip = req.ip || req.headers['x-forwarded-for'] as string;
    const result = await deliveryService.updateDriverState(token, 'ARRIVED', ip);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function confirmDelivered(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const ip = req.ip || req.headers['x-forwarded-for'] as string;
    const result = await deliveryService.updateDriverState(token, 'DELIVERED', ip);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}
