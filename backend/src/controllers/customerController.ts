import { Request, Response } from 'express';
import * as customerService from '../services/customerService';
import { sendSuccess, sendError } from '../utils/response';

export async function searchCustomers(req: Request, res: Response) {
  try {
    const { q } = req.query;
    const customers = await customerService.searchCustomers(req.user!.merchant_id, q as string);
    return sendSuccess(res, customers);
  } catch (err: any) {
    return sendError(res, 'SEARCH_CUSTOMERS_ERROR', err.message, 500);
  }
}

export async function getCustomer(req: Request, res: Response) {
  try {
    const customer = await customerService.getCustomerById(req.user!.merchant_id, req.params.id);
    if (!customer) return sendError(res, 'NOT_FOUND', 'Customer not found', 404);
    return sendSuccess(res, customer);
  } catch (err: any) {
    return sendError(res, 'GET_CUSTOMER_ERROR', err.message, 500);
  }
}

export async function createCustomer(req: Request, res: Response) {
  try {
    const { name, phone, delivery_address } = req.body;

    if (!name || !phone) {
      return sendError(res, 'VALIDATION_ERROR', 'Customer name and phone are required', 400);
    }

    const customer = await customerService.createCustomer(req.user!.merchant_id, {
      name,
      phone,
      delivery_address,
    });

    return sendSuccess(res, customer, 201);
  } catch (err: any) {
    return sendError(res, 'CREATE_CUSTOMER_ERROR', err.message, 500);
  }
}
