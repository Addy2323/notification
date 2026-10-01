import { prisma } from '../database/prisma';

export class AnalyticsService {
  static async getAnalyticsSummary(merchantId: string, range: string = 'TODAY', customStart?: Date, customEnd?: Date) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (range === 'YESTERDAY') {
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

    // Fetch current period orders & items
    const [currentOrders, prevOrders, notificationsCount, deliveriesCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          merchant_id: merchantId,
          created_at: { gte: startDate, lte: endDate },
        },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: {
          merchant_id: merchantId,
          created_at: { gte: prevStartDate, lte: prevEndDate },
        },
      }),
      prisma.orderNotification.count({
        where: {
          order: { merchant_id: merchantId },
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

      const rev = Number(ord.total_revenue || ord.amount || 0);
      const cost = Number(ord.total_cost || 0);
      const profit = ord.gross_profit !== null && ord.gross_profit !== undefined ? Number(ord.gross_profit) : (cost > 0 ? rev - cost : 0);

      totalSales += rev;
      totalCost += cost;
      grossProfit += profit;

      for (const item of ord.items) {
        productsSold += item.quantity;
      }
    }

    // Aggregate Previous Stats for comparison
    let prevTotalSales = 0;
    let prevGrossProfit = 0;
    for (const ord of prevOrders) {
      const rev = Number(ord.total_revenue || ord.amount || 0);
      const cost = Number(ord.total_cost || 0);
      const profit = ord.gross_profit !== null && ord.gross_profit !== undefined ? Number(ord.gross_profit) : (cost > 0 ? rev - cost : 0);
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
          hSales += Number(o.total_revenue || o.amount || 0);
          hProfit += Number(o.gross_profit || 0);
        }

        trendData.push({ label, sales: hSales, profit: hProfit, orders: hourOrders.length });
      }
    } else {
      // Daily trend (last N days)
      const dayMap: Record<string, { sales: number; profit: number; orders: number }> = {};
      for (const o of currentOrders) {
        const key = o.created_at.toISOString().split('T')[0];
        if (!dayMap[key]) dayMap[key] = { sales: 0, profit: 0, orders: 0 };
        dayMap[key].sales += Number(o.total_revenue || o.amount || 0);
        dayMap[key].profit += Number(o.gross_profit || 0);
        dayMap[key].orders += 1;
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

    return {
      period: { range, startDate, endDate },
      kpis: {
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
        salesGrowthPct,
      },
      trend: trendData,
    };
  }
}
