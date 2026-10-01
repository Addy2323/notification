import { prisma } from '../database/prisma';

export interface SalesFilterOptions {
  range?: string; // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, THIS_YEAR, CUSTOM
  startDate?: Date;
  endDate?: Date;
  query?: string;
  driverId?: string;
  status?: string;
  limit?: number;
  page?: number;
}

export class SalesService {
  static async getSalesLedger(merchantId: string, options: SalesFilterOptions = {}) {
    const limit = options.limit || 50;
    const page = options.page || 1;
    const skip = (page - 1) * limit;

    const where: any = {
      merchant_id: merchantId,
    };

    // Handle date range filter
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    if (options.range === 'TODAY') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (options.range === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    } else if (options.range === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date();
    } else if (options.range === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date();
    } else if (options.range === 'THIS_YEAR') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date();
    } else if (options.startDate || options.endDate) {
      start = options.startDate;
      end = options.endDate;
    }

    if (start || end) {
      where.created_at = {};
      if (start) where.created_at.gte = start;
      if (end) where.created_at.lte = end;
    }

    if (options.driverId) {
      where.driver_id = options.driverId;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.query) {
      const q = options.query.trim();
      where.OR = [
        { order_number: { contains: q, mode: 'insensitive' } },
        { customer_name: { contains: q, mode: 'insensitive' } },
        { customer_phone: { contains: q, mode: 'insensitive' } },
        { product_name: { contains: q, mode: 'insensitive' } },
        { driver_name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [totalOrders, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
        include: {
          items: true,
          customer: true,
          driver: true,
        },
      }),
    ]);

    // Calculate aggregated financial summary for this query set
    const allFilteredOrders = await prisma.order.findMany({
      where,
      select: {
        amount: true,
        total_revenue: true,
        total_cost: true,
        gross_profit: true,
        status: true,
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const ord of allFilteredOrders) {
      if (ord.status === 'DELIVERED') deliveredCount++;
      else if (ord.status === 'FAILED' || ord.status === 'CANCELLED') failedCount++;
      else pendingCount++;

      const rev = Number(ord.total_revenue || ord.amount || 0);
      const cost = Number(ord.total_cost || 0);
      const profit = ord.gross_profit !== null && ord.gross_profit !== undefined ? Number(ord.gross_profit) : (cost > 0 ? rev - cost : 0);

      totalRevenue += rev;
      totalCost += cost;
      totalProfit += profit;
    }

    return {
      summary: {
        totalOrders,
        totalRevenue,
        totalCost,
        totalProfit,
        deliveredCount,
        pendingCount,
        failedCount,
      },
      pagination: {
        total: totalOrders,
        page,
        limit,
        totalPages: Math.ceil(totalOrders / limit),
      },
      orders,
    };
  }
}
