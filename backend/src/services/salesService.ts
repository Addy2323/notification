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

export function ledgerFinancials(order: any) {
  const revenue = Number(order.total_revenue ?? order.amount ?? 0);
  const refunded = order.payment_status === 'REFUNDED';
  const event = order.events?.find((e: any) => e.event_type === 'ORDER_REFUNDED');
  let restocked = false;
  try { restocked = JSON.parse(event?.metadata || '{}').restocked === true; } catch {}
  const costKnown = order.total_cost !== null && order.total_cost !== undefined;
  const cost = refunded && restocked ? 0 : Number(order.total_cost ?? 0);
  return { net_revenue: refunded ? 0 : revenue, net_cost: costKnown ? cost : null, net_profit: costKnown ? (refunded ? 0 : revenue) - cost : null, refund_amount: refunded ? revenue : 0 };
}

export class SalesService {
  static async getSalesLedger(merchantId: string, options: SalesFilterOptions = {}) {
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit || 50)));
    const page = Math.max(1, Math.floor(options.page || 1));
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
      if (options.status === 'REFUNDED') where.payment_status = 'REFUNDED';
      else where.status = options.status;
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
          events: { where: { event_type: 'ORDER_REFUNDED' } },
          customer: true,
          driver: true,
        },
      }),
    ]);

    // Calculate aggregated financial summary for this query set
    const allFilteredOrders = await prisma.order.findMany({
      where,
      select: {
        payment_status: true,
        events: { where: { event_type: 'ORDER_REFUNDED' } },
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
    let refundedCount = 0;
    let totalRefunds = 0;
    let missingCostCount = 0;

    for (const ord of allFilteredOrders) {
      if (ord.status === 'DELIVERED') deliveredCount++;
      else if (ord.status === 'FAILED' || ord.status === 'CANCELLED') failedCount++;
      else pendingCount++;

      const financials = ledgerFinancials(ord);
      totalRevenue += financials.net_revenue;
      totalCost += financials.net_cost ?? 0;
      totalProfit += financials.net_profit ?? 0;
      totalRefunds += financials.refund_amount;
      if (ord.payment_status === 'REFUNDED') refundedCount++;
      if (financials.net_cost === null) missingCostCount++;
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
        refundedCount,
        totalRefunds,
        missingCostCount,
      },
      pagination: {
        total: totalOrders,
        page,
        limit,
        totalPages: Math.ceil(totalOrders / limit),
      },
      orders: orders.map(order => ({ ...order, ...ledgerFinancials(order) })),
    };
  }
}
