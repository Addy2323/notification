import { Request, Response } from 'express';
import * as orderService from '../services/orderService';
import { sendSuccess, sendError } from '../utils/response';

export async function createOrder(req: Request, res: Response) {
  try {
    const { customerName, customerPhone, deliveryAddress, productName, imageUrl, amount, customerId, driverId, driverName, driverPhone } = req.body;

    if (!customerName || !customerPhone || !deliveryAddress || !productName) {
      return sendError(res, 'VALIDATION_ERROR', 'Customer name, phone, delivery address, and product name are required', 400);
    }

    const result = await orderService.createOrder({
      merchantId: req.user!.merchant_id,
      userId: req.user!.id,
      customerId,
      customerName,
      customerPhone,
      deliveryAddress,
      productName,
      imageUrl,
      amount: amount ? parseFloat(amount) : undefined,
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
