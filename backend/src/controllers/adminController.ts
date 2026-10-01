import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import * as adminService from '../services/adminService';
import * as merchantRankingService from '../services/merchantRankingService';
import * as trafficAnalyticsService from '../services/trafficAnalyticsService';
import * as systemHealthService from '../services/systemHealthService';
import * as adminReportService from '../services/adminReportService';

export async function getOverview(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || 'THIS_MONTH';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const data = await adminService.getAdminOverviewMetrics(period, startDate, endDate);
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getGrowth(req: Request, res: Response) {
  try {
    const interval = (req.query.interval as any) || 'MONTHLY';
    const data = await adminService.getPlatformGrowthData(interval);
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function listMerchants(req: Request, res: Response) {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;

    const merchants = await adminService.getAllMerchantsDetailed(search, status);
    return sendSuccess(res, merchants);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function createMerchant(req: Request, res: Response) {
  try {
    const adminUserId = req.user!.id;
    const {
      fullName,
      phone,
      email,
      businessName,
      brandName,
      businessPhone,
      businessEmail,
      businessAddress,
      businessLocation,
      username,
      temporaryPassword,
      pinCode,
      logoUrl,
      brandColor,
      status,
    } = req.body;

    if (!fullName || !phone || !businessName || !businessPhone || !temporaryPassword) {
      return sendError(res, 'VALIDATION_ERROR', 'Full name, phone, business name, business phone, and temporary password are required.', 400);
    }

    const newMerchant = await adminService.createMerchantFromAdmin({
      fullName,
      phone,
      email,
      businessName,
      brandName,
      businessPhone,
      businessEmail,
      businessAddress,
      businessLocation,
      username,
      temporaryPassword,
      pinCode,
      logoUrl,
      brandColor,
      status,
      adminUserId,
    });

    return sendSuccess(res, newMerchant, 201);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function getMerchantProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const profile = await adminService.getMerchant360Profile(id);
    return sendSuccess(res, profile);
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message, 404);
  }
}

export async function toggleMerchantStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(status)) {
      return sendError(res, 'VALIDATION_ERROR', 'Status must be ACTIVE, SUSPENDED, or ARCHIVED', 400);
    }

    const updated = await adminService.updateMerchantStatus(id, status, req.user!.id, reason);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function globalSearch(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const results = await adminService.globalAdminSearch(q);
    return sendSuccess(res, results);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getRankings(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || 'THIS_MONTH';
    const metric = (req.query.metric as any) || 'SCORE';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const rankings = await merchantRankingService.getMerchantRankings(period, metric, limit);
    return sendSuccess(res, rankings);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getTraffic(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || 'THIS_MONTH';
    const overview = await trafficAnalyticsService.getTrafficOverview(period);
    return sendSuccess(res, overview);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getLiveTraffic(req: Request, res: Response) {
  try {
    const stream = await trafficAnalyticsService.getLiveActivityStream(15);
    return sendSuccess(res, stream);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getHealth(req: Request, res: Response) {
  try {
    const health = await systemHealthService.getSystemHealth();
    return sendSuccess(res, health);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function resolveIncident(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const incident = await systemHealthService.resolveIncident(id);
    return sendSuccess(res, incident);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function downloadPDFReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || 'THIS_MONTH';
    const reportType = (req.query.reportType as any) || 'PLATFORM_OVERVIEW';
    const merchantId = req.query.merchantId as string;

    const pdfBuffer = await adminReportService.generateAdminPDFReport({
      period,
      reportType,
      merchantId,
      adminName: req.user?.name || 'Administrator',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=LUMO_Admin_Report_${period}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function downloadExcelReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || 'THIS_MONTH';
    const reportType = (req.query.reportType as any) || 'PLATFORM_OVERVIEW';
    const merchantId = req.query.merchantId as string;

    const excelBuffer = await adminReportService.generateAdminExcelReport({
      period,
      reportType,
      merchantId,
      adminName: req.user?.name || 'Administrator',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=LUMO_Admin_Report_${period}.xlsx`);
    return res.send(excelBuffer);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const logs = await adminService.getAuditLogs();
    return sendSuccess(res, logs);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function updateMerchant(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminUserId = req.user!.id;
    const {
      businessName,
      businessPhone,
      businessEmail,
      location,
      logoUrl,
      brandColor,
      status,
      fullName,
      phone,
      email,
      password,
      pinCode,
    } = req.body;

    const updated = await adminService.updateMerchantFromAdmin(id, {
      businessName,
      businessPhone,
      businessEmail,
      location,
      logoUrl,
      brandColor,
      status,
      fullName,
      phone,
      email,
      password,
      pinCode,
      adminUserId,
    });

    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function deleteMerchant(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminUserId = req.user!.id;

    const result = await adminService.deleteMerchantFromAdmin(id, adminUserId);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

