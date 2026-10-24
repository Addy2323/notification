import * as orderEditService from '../services/orderEditService';
import { Request, Response } from 'express';
import { z } from 'zod';

const money = z.number().finite().min(0).max(9999999999.99);
const itemSchema = z.object({ productName: z.string().trim().min(1), unitSellingPrice: money, unitCostPrice: money.optional(), quantity: z.number().int().min(1).max(100000).optional(), discount: money.optional() }).refine(it => (it.discount || 0) <= it.unitSellingPrice * (it.quantity || 1), 'Discount exceeds selling total');
import * as orderService from '../services/orderService';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../database/prisma';
import { MesejiSMSAdapter } from '../notifications/adapter';
import { smsManagementService } from '../services/smsManagementService';

export async function createOrder(req: Request, res: Response) {
  try {
    const { customerName, customerPhone, deliveryAddress, productName, imageUrl, amount, customerId, driverId, driverName, driverPhone } = req.body;

    if (!customerName || !customerPhone || !deliveryAddress || !productName) {
      return sendError(res, 'VALIDATION_ERROR', 'Customer name, phone, delivery address, and product name are required', 400);
    }

    const parsed = z.object({ items: z.array(itemSchema).min(1).max(100).optional(), amount: z.preprocess(v => v === undefined || v === '' ? undefined : Number(v), money.optional()) }).safeParse(req.body);
    if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 400);
    const result = await orderService.createOrder({
      merchantId: req.user!.merchant_id,
      userId: req.user!.id,
      customerId,
      customerName,
      customerPhone,
      deliveryAddress,
      productName,
      imageUrl,
      amount: parsed.data.amount,
      items: parsed.data.items,
      driverId,
      driverName,
      driverPhone,
    });

    return sendSuccess(res, result, 201);
  } catch (err: any) {
    return sendError(res, 'CREATE_ORDER_ERROR', err.message, 500);
  }
}

export async function listOrders(req: Request, res: Response) {
  try {
    const { search, status, driverId, page, limit } = req.query;

    const result = await orderService.listOrders(req.user!.merchant_id, {
      search: search as string,
      status: status as string,
      driverId: driverId as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'LIST_ORDERS_ERROR', err.message, 500);
  }
}

export async function getOrderDetail(req: Request, res: Response) {
  try {
    const result = await orderService.getOrderDetail(req.user!.merchant_id, req.params.id);
    return sendSuccess(res, result);
  } catch (err: any) {
    const status = err.message === 'Order not found' ? 404 : 500;
    return sendError(res, 'ORDER_DETAIL_ERROR', err.message, status);
  }
}

export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'VALIDATION_ERROR', 'Status is required', 400);
    }

    const result = await orderService.updateOrderStatus(
      req.user!.merchant_id,
      req.user!.id,
      req.params.id,
      status,
    );

    return sendSuccess(res, result);
  } catch (err: any) {
    const status = err.message.includes('Cannot transition') ? 400 : 500;
    return sendError(res, 'STATUS_UPDATE_ERROR', err.message, status);
  }
}

export async function assignDriver(req: Request, res: Response) {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return sendError(res, 'VALIDATION_ERROR', 'Driver ID is required', 400);
    }

    const result = await orderService.assignDriver(
      req.user!.merchant_id,
      req.user!.id,
      req.params.id,
      driverId,
    );

    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'ASSIGN_DRIVER_ERROR', err.message, 500);
  }
}

export async function getOrderMetrics(req: Request, res: Response) {
  try {
    const result = await orderService.getOrderMetrics(req.user!.merchant_id);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'METRICS_ERROR', err.message, 500);
  }
}

export async function refundOrder(req: Request, res: Response) {
  const input = z.object({ reason: z.string().trim().min(1).max(500), restocked: z.boolean(), updatedAt: z.string().datetime().optional() }).safeParse(req.body);
  if (!input.success) return sendError(res, 'VALIDATION_ERROR', 'Provide a refund reason and whether goods were returned to stock', 400);
  try {
    return sendSuccess(res, await orderService.refundOrder(req.user!.merchant_id, req.user!.id, req.params.id, input.data));
  } catch (err: any) {
    return sendError(res, 'REFUND_ERROR', err.message, err.message === 'Order not found' ? 404 : 400);
  }
}

export async function editOrder(req: Request, res: Response) {
  const parsed = orderEditService.orderEditSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  try { return sendSuccess(res, await orderEditService.editOrder(req.user!.merchant_id, req.user!.id, req.params.id, parsed.data)); }
  catch (err: any) { return sendError(res, 'ORDER_EDIT_ERROR', err.message, err instanceof orderEditService.OrderEditError ? err.status : 500); }
}
export async function deleteOrder(req: Request, res: Response) {
  const parsed = z.object({ updatedAt: z.string().datetime() }).strict().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', 'Order version is required. Reopen the order and try again.', 400);
  try { return sendSuccess(res, await orderEditService.deleteOrder(req.user!.merchant_id, req.user!.id, req.params.id, parsed.data.updatedAt)); }
  catch (err: any) { return sendError(res, 'ORDER_DELETE_ERROR', err.message, err instanceof orderEditService.OrderEditError ? err.status : 500); }
}

export async function retryNotification(req: Request, res: Response) {
  try {
    const { id, notificationId } = req.params;
    const notification = await prisma.orderNotification.findFirst({
      where: { id: notificationId, order_id: id },
      include: { order: true },
    });

    if (!notification) {
      return sendError(res, 'NOT_FOUND', 'Notification not found', 404);
    }

    if (req.user!.role !== 'ADMIN' && notification.order.merchant_id !== req.user!.merchant_id) {
      return sendError(res, 'FORBIDDEN', 'Access denied', 403);
    }

    // Deduct credits
    const deductRes = await smsManagementService.deductCredits({
      merchantId: notification.order.merchant_id,
      messageBody: notification.message_body,
      reason: `Retry Order #${notification.order.order_number} ${notification.event_type} SMS`,
      reference: notification.order_id,
    });

    if (!deductRes.allowed) {
      return sendError(
        res,
        'INSUFFICIENT_CREDITS',
        `Insufficient SMS credits (${deductRes.remainingCredits} available, needed ${deductRes.units}). Please top up your balance.`,
        400
      );
    }

    const adapter = new MesejiSMSAdapter();
    const result = await adapter.sendSMS(notification.recipient_phone, notification.message_body);

    if (result.success) {
      const updated = await prisma.orderNotification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          provider_message_id: result.messageId,
          sent_at: new Date(),
          delivered_at: new Date(),
          failure_reason: null,
          failed_at: null,
        },
      });
      return sendSuccess(res, { notification: updated, message: 'SMS sent successfully!' });
    } else {
      await prisma.orderNotification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          failed_at: new Date(),
          failure_reason: result.error || 'Provider dispatch failed',
        },
      });
      return sendError(res, 'SMS_DISPATCH_FAILED', result.error || 'SMS dispatch failed', 502);
    }
  } catch (err: any) {
    return sendError(res, 'RETRY_ERROR', err.message, 500);
  }
}
