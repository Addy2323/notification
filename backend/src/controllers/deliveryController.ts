import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { createDeliverySchema, replaceDriverSchema, updateBrandingSchema } from '../validators';
import * as deliveryService from '../services/deliveryService';
import { prisma } from '../database/prisma';

export async function create(req: Request, res: Response) {
  try {
    const parse = createDeliverySchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await deliveryService.createDelivery({
      merchantId: req.user!.merchant_id,
      userId: req.user!.id,
      customerPhone: parse.data.customer_phone,
      deliveryAddress: parse.data.delivery_address,
      productDescription: parse.data.product_description,
      driverName: parse.data.driver_name,
      driverPhone: parse.data.driver_phone,
    });

    return sendSuccess(res, result, 201);
  } catch (err: any) {
    return sendError(res, 'CREATE_FAILED', err.message || 'Failed to create delivery', 400);
  }
}

export async function list(req: Request, res: Response) {
  try {
    const { search, status, page, limit } = req.query;
    const result = await deliveryService.getMerchantDeliveries(req.user!.merchant_id, {
      search: search as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function detail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const delivery = await deliveryService.getDeliveryDetail(req.user!.merchant_id, id);
    return sendSuccess(res, delivery);
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message || 'Delivery not found', 404);
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = await deliveryService.cancelDelivery(req.user!.merchant_id, req.user!.id, id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function replaceDriver(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const parse = replaceDriverSchema.safeParse(req.body);
    if (!parse.success) {
      return sendError(res, 'VALIDATION_ERROR', parse.error.issues[0].message, 400);
    }

    const result = await deliveryService.replaceDriver(
      req.user!.merchant_id,
      req.user!.id,
      id,
      parse.data.driver_name,
      parse.data.driver_phone
    );

    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function getMetrics(req: Request, res: Response) {
  try {
    const metrics = await deliveryService.getMerchantMetrics(req.user!.merchant_id);
    return sendSuccess(res, metrics);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function updateBranding(req: Request, res: Response) {
  try {
    const parse = updateBrandingSchema.safeParse(req.body);
    if (!parse.success) {
      return sendError(res, 'VALIDATION_ERROR', parse.error.issues[0].message, 400);
    }

    const updated = await prisma.merchant.update({
      where: { id: req.user!.merchant_id },
      data: parse.data,
    });

    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'UPDATE_FAILED', err.message, 400);
  }
}
