import { prisma } from '../database/prisma';
import { ledgerFinancials } from './salesService';

export class AnalyticsService {
  static async getAnalyticsSummary(merchantId: string, range: string = 'TODAY', customStart?: Date, customEnd?: Date) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (range === 'ALL') {
      startDate = new Date(0); endDate = now; prevStartDate = new Date(0); prevEndDate = new Date(0);
    } else if (range === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);

      const dayBefore = new Date(yesterday);
      dayBefore.setDate(yesterday.getDate() - 1);
      prevStartDate = new Date(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), 0, 0, 0);
      prevEndDate = new Date(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), 23, 59, 59);
    } else if (range === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();

      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(-1);
    } else if (range === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date();

      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (range === 'THIS_YEAR') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      endDate = new Date();

      prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
      prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
      const durationMs = customEnd.getTime() - customStart.getTime();
      prevStartDate = new Date(customStart.getTime() - durationMs);
      prevEndDate = new Date(customStart.getTime() - 1);
    } else {
      // TODAY default
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      prevStartDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      prevEndDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    }

    // Compare equal elapsed durations rather than a partial month against a full month.
    if (range !== 'ALL') {
      prevEndDate = new Date(Math.min(prevEndDate.getTime(), prevStartDate.getTime() + endDate.getTime() - startDate.getTime()));
    }
    // Fetch current period orders & items
    const [currentOrders, prevOrders, notificationsCount, deliveriesCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          merchant_id: merchantId,
          created_at: { gte: startDate, lte: endDate },
        },
        include: { items: true, events: { where: { event_type: 'ORDER_REFUNDED' } } },
      }),
      prisma.order.findMany({
        where: {
          merchant_id: merchantId,
          created_at: { gte: prevStartDate, lte: prevEndDate },
        },
        include: { events: { where: { event_type: 'ORDER_REFUNDED' } } },
      }),
      prisma.orderNotification.count({
        where: {
          order: { merchant_id: merchantId },
          status: { in: ['SENT', 'DELIVERED'] },
          created_at: { gte: startDate, lte: endDate },
        },
      }),
      prisma.delivery.count({
        where: {
          merchant_id: merchantId,
          created_at: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Aggregate Current Stats
    let totalSales = 0;
    let totalCost = 0;
    let grossProfit = 0;
    let productsSold = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const ord of currentOrders) {
      if (ord.status === 'DELIVERED') deliveredCount++;
      else if (ord.status === 'FAILED' || ord.status === 'CANCELLED') failedCount++;
      else pendingCount++;

      const f = ledgerFinancials(ord);
      const rev = f.net_revenue;
      const cost = f.net_cost ?? 0;
      const profit = f.net_profit ?? 0;

      totalSales += rev;
      totalCost += cost;
      grossProfit += profit;

      if (!ord.items.length && ord.payment_status !== 'REFUNDED') productsSold++;
      for (const item of ord.items) {
        if (ord.payment_status !== 'REFUNDED') productsSold += item.quantity;
      }
    }

    // Aggregate Previous Stats for comparison
    let prevTotalSales = 0;
    let prevGrossProfit = 0;
    for (const ord of prevOrders) {
      const f = ledgerFinancials(ord);
      const rev = f.net_revenue;
      const cost = f.net_cost ?? 0;
      const profit = f.net_profit ?? 0;
      prevTotalSales += rev;
      prevGrossProfit += profit;
    }

    const salesGrowthPct = prevTotalSales > 0 ? Math.round(((totalSales - prevTotalSales) / prevTotalSales) * 100) : 0;

    // Generate trend data points for chart
    const trendData: Array<{ label: string; sales: number; profit: number; orders: number }> = [];

    if (range === 'TODAY' || range === 'YESTERDAY') {
      // Hourly trend (00:00 - 23:00)
      for (let h = 0; h < 24; h += 2) {
        const label = `${String(h).padStart(2, '0')}:00`;
        const hourOrders = currentOrders.filter((o) => {
          const hr = o.created_at.getHours();
          return hr >= h && hr < h + 2;
        });

        let hSales = 0;
        let hProfit = 0;
        for (const o of hourOrders) {
          hSales += ledgerFinancials(o).net_revenue;
          hProfit += ledgerFinancials(o).net_profit ?? 0;
        }

        trendData.push({ label, sales: hSales, profit: hProfit, orders: hourOrders.length });
      }
    } else {
      // Daily trend (last N days)
      const dayMap: Record<string, { sales: number; profit: number; orders: number }> = {};
      for (const o of currentOrders) {
        const key = `${o.created_at.getFullYear()}-${String(o.created_at.getMonth() + 1).padStart(2, '0')}-${String(o.created_at.getDate()).padStart(2, '0')}`;
        if (!dayMap[key]) dayMap[key] = { sales: 0, profit: 0, orders: 0 };
        dayMap[key].sales += ledgerFinancials(o).net_revenue;
        dayMap[key].profit += ledgerFinancials(o).net_profit ?? 0;
        dayMap[key].orders += 1;
      }

      if (range !== 'ALL') {
        const day = new Date(startDate); day.setHours(0, 0, 0, 0);
        while (day <= endDate) {
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
          dayMap[key] ||= { sales: 0, profit: 0, orders: 0 };
          day.setDate(day.getDate() + 1);
        }
      }
      const sortedKeys = Object.keys(dayMap).sort();
      for (const k of sortedKeys) {
        trendData.push({
          label: k,
          sales: dayMap[k].sales,
          profit: dayMap[k].profit,
          orders: dayMap[k].orders,
        });
      }
    }

    // Use the same filtered orders for rankings, including legacy orders without items.
    const products = new Map<string, { name: string; totalQty: number; totalRevenue: number; totalProfit: number; missingCostCount: number; orderIds: Set<string> }>();
    for (const order of currentOrders) {
      const lines = order.items.length ? order.items.map(item => ({
        key: item.product_id || item.product_name_snapshot.trim().toLowerCase(), name: item.product_name_snapshot,
        quantity: item.quantity, revenue: Number(item.subtotal), cost: item.unit_cost_price === null ? null : Number(item.unit_cost_price) * item.quantity
      })) : [{ key: order.product_name.trim().toLowerCase(), name: order.product_name, quantity: 1, revenue: Number(order.total_revenue ?? order.amount ?? 0), cost: order.total_cost === null ? null : Number(order.total_cost) }];
      for (const line of lines) {
        const product = products.get(line.key) || { name: line.name, totalQty: 0, totalRevenue: 0, totalProfit: 0, missingCostCount: 0, orderIds: new Set<string>() };
        const f = ledgerFinancials({ ...order, total_revenue: line.revenue, total_cost: line.cost });
        product.totalQty += order.payment_status === 'REFUNDED' ? 0 : line.quantity;
        product.totalRevenue += f.net_revenue;
        product.totalProfit += f.net_profit ?? 0;
        if (f.net_profit === null) product.missingCostCount++;
        product.orderIds.add(order.id);
        products.set(line.key, product);
      }
    }
    const topProducts = [...products.values()].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map(({ orderIds, ...product }) => ({ ...product, orderCount: orderIds.size }));
    return {
      topProducts,
      period: { range, startDate, endDate },
      kpis: {
        totalRefunds: currentOrders.reduce((sum, order) => sum + ledgerFinancials(order).refund_amount, 0),
        missingCostCount: currentOrders.filter(order => ledgerFinancials(order).net_cost === null).length,
        totalOrders: currentOrders.length,
        totalSales,
        totalCost,
        grossProfit,
        productsSold,
        deliveriesCreated: deliveriesCount,
        deliveredCount,
        pendingCount,
        failedCount,
        notificationsSent: notificationsCount,
      },
      comparison: {
        prevOrders: prevOrders.length,
        prevTotalSales,
        prevGrossProfit,
        salesGrowthPct: range === 'ALL' || prevTotalSales === 0 ? null : salesGrowthPct,
      },
      trend: trendData,
    };
  }
}
