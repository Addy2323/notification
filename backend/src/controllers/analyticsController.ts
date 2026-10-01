import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { sendSuccess, sendError } from '../utils/response';

export class AnalyticsController {
  static async getSummary(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const { range, startDate, endDate } = req.query;

      const result = await AnalyticsService.getAnalyticsSummary(
        merchantId,
        range as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }
}
