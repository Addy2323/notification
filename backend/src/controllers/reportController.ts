import { Request, Response } from 'express';
import { ReportService } from '../services/reportService';
import { sendError } from '../utils/response';

export class ReportController {
  static async downloadPDF(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const { reportType, startDate, endDate } = req.query;

      const pdfBuffer = await ReportService.generatePDF(merchantId, {
        reportType: (reportType as any) || 'DAILY',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=LUMO_${reportType || 'Daily'}_Report.pdf`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }

  static async downloadExcel(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const { reportType, startDate, endDate } = req.query;

      const excelBuffer = await ReportService.generateExcel(merchantId, {
        reportType: (reportType as any) || 'DAILY',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=LUMO_${reportType || 'Daily'}_Report.xlsx`);
      return res.send(excelBuffer);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }
}
