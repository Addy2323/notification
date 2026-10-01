import { Request, Response } from 'express';
import { SalesService } from '../services/salesService';
import { sendSuccess, sendError } from '../utils/response';

export class SalesController {
  static async getSalesLedger(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const { range, startDate, endDate, q, driverId, status, limit, page } = req.query;

      const result = await SalesService.getSalesLedger(merchantId, {
        range: range as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        query: q as string,
        driverId: driverId as string,
        status: status as string,
        limit: limit ? Number(limit) : undefined,
        page: page ? Number(page) : undefined,
      });

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }
}
