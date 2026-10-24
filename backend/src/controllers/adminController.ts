import { prisma } from '../database/prisma';
import { resolveLanguage } from '../localization';
import { getPlatformAnalytics } from '../services/adminAnalyticsService';
import * as adminDeliveryService from '../services/adminDeliveryService';
import { z } from 'zod';
import * as adminOrderService from '../services/adminOrderService';
const globalOrderFilters = z.object({
  search: z.string().max(200).optional(), merchantId: z.string().optional(),
  status: z.enum(['ALL', 'PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25)
});
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
    const period = z.enum(['ALL', 'TODAY', 'THIS_WEEK', 'THIS_MONTH', 'SEMI_ANNUAL']).safeParse(req.query.period || 'ALL');
    if (!period.success) return sendError(res, 'VALIDATION_ERROR', 'Invalid merchant profile period', 400);
    const profile = await adminService.getMerchant360Profile(id, period.data);
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
      language: resolveLanguage(req),
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
      language: resolveLanguage(req),
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


export async function listGlobalOrders(req: Request, res: Response) {
  const parsed = globalOrderFilters.safeParse(req.query);
  if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', 'Invalid order filters or pagination', 400);
  try { return sendSuccess(res, await adminOrderService.listGlobalOrders(parsed.data)); }
  catch (err: any) { return sendError(res, 'SERVER_ERROR', err.message, 500); }
}
export async function getGlobalOrder(req: Request, res: Response) {
  try {
    const order = await adminOrderService.getGlobalOrder(req.params.id);
    if (!order) return sendError(res, 'NOT_FOUND', 'Order not found', 404);
    return sendSuccess(res, order);
  } catch (err: any) { return sendError(res, 'SERVER_ERROR', err.message, 500); }
}

const deliveryFilters = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(200).optional(), source: z.enum(['ALL', 'ORDER', 'DELIVERY']).default('ALL'),
  status: z.enum(['ALL', 'PENDING', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED']).default('ALL')
});
export async function listAdminDeliveries(req: Request, res: Response) {
  const parsed = deliveryFilters.safeParse(req.query);
  if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', 'Invalid delivery filters or pagination', 400);
  try { return sendSuccess(res, await adminDeliveryService.listAdminDeliveries(parsed.data)); }
  catch (err: any) { return sendError(res, 'SERVER_ERROR', err.message, 500); }
}
export async function getAdminDelivery(req: Request, res: Response) {
  const source = req.params.source;
  if (source !== 'ORDER' && source !== 'DELIVERY') return sendError(res, 'VALIDATION_ERROR', 'Invalid delivery source', 400);
  try {
    const record = await adminDeliveryService.getAdminDelivery(source, req.params.id);
    return record ? sendSuccess(res, record) : sendError(res, 'NOT_FOUND', 'Delivery not found', 404);
  } catch (err: any) { return sendError(res, 'SERVER_ERROR', err.message, 500); }
}

export async function getPlatformAnalyticsSummary(req: Request, res: Response) {
  const period = z.enum(['ALL', 'TODAY', 'THIS_WEEK', 'THIS_MONTH', 'SEMI_ANNUAL']).safeParse(req.query.period || 'THIS_MONTH');
  if (!period.success) return sendError(res, 'VALIDATION_ERROR', 'Invalid analytics period', 400);
  try { return sendSuccess(res, await getPlatformAnalytics(period.data)); }
  catch (err: any) { return sendError(res, 'SERVER_ERROR', err.message, 500); }
}

export async function listAdminNotifications(req: Request, res: Response) {
  try {
    const { channel, status, event_type, search, page, limit } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (channel && channel !== 'ALL') where.channel = channel;
    if (event_type && event_type !== 'ALL') {
      if (event_type === 'RECEIPT_AUTOMATIC') {
        where.event_type = 'RECEIPT_CONFIRMATION_REQUEST';
      } else if (event_type === 'RECEIPT_RESENT') {
        where.event_type = 'RECEIPT_CONFIRMATION_RESENT';
      } else if (event_type === 'RECEIPT_FOLLOWUP') {
        where.event_type = { in: ['RECEIPT_CONFIRMATION_THANK_YOU', 'RECEIPT_CONFIRMATION_INVESTIGATION', 'STAFF_FOLLOWUP_SMS'] };
      } else if (event_type === 'ORDER_EVENTS') {
        where.event_type = { notIn: ['RECEIPT_CONFIRMATION_REQUEST', 'RECEIPT_CONFIRMATION_RESENT', 'RECEIPT_CONFIRMATION_THANK_YOU', 'RECEIPT_CONFIRMATION_INVESTIGATION', 'STAFF_FOLLOWUP_SMS'] };
      } else {
        where.event_type = event_type;
      }
    }

    if (search && (search as string).trim()) {
      const s = (search as string).trim();
      where.OR = [
        { recipient_phone: { contains: s } },
        { message_body: { contains: s, mode: 'insensitive' } },
        { provider_message_id: { contains: s } },
        { order: { order_number: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, notifications, kpiCounts] = await Promise.all([
      prisma.orderNotification.count({ where }),
      prisma.orderNotification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
        include: {
          order: {
            select: {
              id: true,
              order_number: true,
              customer_name: true,
              merchant: { select: { id: true, business_name: true } },
            },
          },
        },
      }),
      Promise.all([
        prisma.orderNotification.count(),
        prisma.orderNotification.count({ where: { status: { in: ['SENT', 'DELIVERED'] } } }),
        prisma.orderNotification.count({ where: { status: 'QUEUED' } }),
        prisma.orderNotification.count({ where: { status: 'FAILED' } }),
        prisma.orderNotification.count({ where: { event_type: 'RECEIPT_CONFIRMATION_REQUEST' } }),
        prisma.orderNotification.count({ where: { event_type: 'RECEIPT_CONFIRMATION_RESENT' } }),
      ]),
    ]);

    return sendSuccess(res, {
      notifications,
      kpis: {
        total: kpiCounts[0],
        delivered: kpiCounts[1],
        queued: kpiCounts[2],
        failed: kpiCounts[3],
        automatic_confirmations: kpiCounts[4],
        resent_confirmations: kpiCounts[5],
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function retryAdminNotification(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const notif = await prisma.orderNotification.findUnique({
      where: { id },
    });

    if (!notif) return sendError(res, 'NOT_FOUND', 'Notification not found', 404);

    const { MesejiSMSAdapter } = await import('../notifications/adapter');
    const adapter = new MesejiSMSAdapter();
    const result = await adapter.sendSMS(notif.recipient_phone, notif.message_body);

    const updated = await prisma.orderNotification.update({
      where: { id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        provider_message_id: result.messageId || notif.provider_message_id,
        failure_reason: result.error || null,
        sent_at: result.success ? new Date() : notif.sent_at,
      },
    });

    return sendSuccess(res, { success: result.success, notification: updated });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}
