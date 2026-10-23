jest.mock('../database/prisma', () => ({ prisma: {
  order: { findMany: jest.fn() }, orderNotification: { count: jest.fn() }, delivery: { count: jest.fn() }
} }));
import { prisma } from '../database/prisma';
import { AnalyticsService } from '../services/analyticsService';

const item = { product_id: null, product_name_snapshot: 'Phone', quantity: 2, subtotal: 200, unit_cost_price: 60 };
const order = { id: 'one', product_name: 'Phone', created_at: new Date(), status: 'DELIVERED', payment_status: 'PAID', total_revenue: 200, total_cost: 120, items: [item], events: [] };
beforeEach(() => {
  jest.clearAllMocks();
  (prisma.orderNotification.count as jest.Mock).mockResolvedValue(3);
  (prisma.delivery.count as jest.Mock).mockResolvedValue(1);
});
it('uses the same filtered orders for cards, chart, and product rankings', async () => {
  (prisma.order.findMany as jest.Mock).mockResolvedValueOnce([order]).mockResolvedValueOnce([{ ...order, total_revenue: 100, total_cost: 60 }]);
  const result = await AnalyticsService.getAnalyticsSummary('merchant', 'TODAY');
  expect(result.kpis).toMatchObject({ totalSales: 200, totalCost: 120, grossProfit: 80, productsSold: 2, notificationsSent: 3 });
  expect(result.trend.reduce((sum, point) => sum + point.sales, 0)).toBe(200);
  expect(result.topProducts[0]).toMatchObject({ totalRevenue: 200, totalProfit: 80, totalQty: 2, orderCount: 1 });
  expect(result.comparison.salesGrowthPct).toBe(100);
  for (const [query] of (prisma.order.findMany as jest.Mock).mock.calls) expect(query.where.merchant_id).toBe('merchant');
  expect(prisma.orderNotification.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ['SENT', 'DELIVERED'] }, order: { merchant_id: 'merchant' } }) }));
});
it('adjusts refunds, excludes missing-cost profit, and deduplicates product order counts', async () => {
  (prisma.order.findMany as jest.Mock).mockResolvedValueOnce([
    { ...order, items: [{ ...item, quantity: 1, subtotal: 100 }, { ...item, quantity: 1, subtotal: 100 }] },
    { ...order, id: 'refund', payment_status: 'REFUNDED', events: [{ event_type: 'ORDER_REFUNDED', metadata: JSON.stringify({ restocked: true }) }] },
    { ...order, id: 'legacy', product_name: 'Legacy', total_revenue: null, amount: 50, total_cost: null, items: [] }
  ]).mockResolvedValueOnce([]);
  const result = await AnalyticsService.getAnalyticsSummary('merchant', 'ALL');
  expect(result.kpis).toMatchObject({ totalSales: 250, totalCost: 120, grossProfit: 80, totalRefunds: 200, productsSold: 3, missingCostCount: 1 });
  expect(result.topProducts.find(p => p.name === 'Phone')).toMatchObject({ totalRevenue: 200, totalProfit: 80, orderCount: 2, totalQty: 2 });
  expect(result.topProducts.find(p => p.name === 'Legacy')).toMatchObject({ totalRevenue: 50, missingCostCount: 1 });
  expect(result.trend.reduce((sum, p) => sum + p.sales, 0)).toBe(250);
  expect(result.comparison.salesGrowthPct).toBeNull();
});
