import { Request, Response } from 'express';
import * as driverSvc from '../services/driverService';
import { sendSuccess, sendError } from '../utils/response';

export async function listDrivers(req: Request, res: Response) {
  try {
    const drivers = await driverSvc.listDrivers(req.user!.merchant_id);
    return sendSuccess(res, drivers);
  } catch (err: any) {
    return sendError(res, 'LIST_DRIVERS_ERROR', err.message, 500);
  }
}

export async function searchDrivers(req: Request, res: Response) {
  try {
    const { q } = req.query;
    const drivers = await driverSvc.searchDrivers(req.user!.merchant_id, q as string);
    return sendSuccess(res, drivers);
  } catch (err: any) {
    return sendError(res, 'SEARCH_DRIVERS_ERROR', err.message, 500);
  }
}

export async function getDriver(req: Request, res: Response) {
  try {
    const driver = await driverSvc.getDriverById(req.user!.merchant_id, req.params.id);
    if (!driver) return sendError(res, 'NOT_FOUND', 'Driver not found', 404);
    return sendSuccess(res, driver);
  } catch (err: any) {
    return sendError(res, 'GET_DRIVER_ERROR', err.message, 500);
  }
}

export async function createMerchantDriver(req: Request, res: Response) {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return sendError(res, 'VALIDATION_ERROR', 'Driver name and phone are required', 400);
    }

    const driver = await driverSvc.createDriver(req.user!.merchant_id, { name, phone });
    return sendSuccess(res, driver, 201);
  } catch (err: any) {
    return sendError(res, 'CREATE_DRIVER_ERROR', err.message, 500);
  }
}
