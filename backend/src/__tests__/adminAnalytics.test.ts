jest.mock('../database/prisma', () => ({ prisma: {
  order: { findMany: jest.fn() }, delivery: { findMany: jest.fn() }, orderNotification: { findMany: jest.fn() }, notification: { findMany: jest.fn() }, merchant: { groupBy: jest.fn() }
} }));
import { prisma } from '../database/prisma';
import { getPlatformAnalytics } from '../services/adminAnalyticsService';

beforeEach(() => {
  jest.clearAllMocks();
  for (const model of [prisma.order, prisma.delivery, prisma.orderNotification, prisma.notification]) (model.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.merchant.groupBy as jest.Mock).mockResolvedValue([{ status: 'ACTIVE', _count: { _all: 2 } }]);
});
it('returns no invented SMS percentage or sales when there are no records', async () => {
  const result = await getPlatformAnalytics('TODAY');
  expect(result.notifications.deliveryRate).toBeNull();
  expect(result.summary).toMatchObject({ orders: 0, sales: 0, profit: 0 });
  expect(result.trend).toHaveLength(24);
  expect(result.trend.every(point => point.sales === 0)).toBe(true);
});
it('uses consistent totals and graph buckets with refunds and both dispatch sources', async () => {
  const created_at = new Date();
  (prisma.order.findMany as jest.Mock).mockResolvedValue([
    { created_at, merchant_id: 'm', status: 'DELIVERED', total_revenue: 100, total_cost: 60, events: [] },
    { created_at, merchant_id: 'm', status: 'DELIVERED', total_revenue: 100, total_cost: 60, payment_status: 'REFUNDED', events: [] },
    { created_at, merchant_id: 'm', status: 'PENDING', amount: 50, total_cost: null, events: [] }
  ]);
  (prisma.delivery.findMany as jest.Mock).mockResolvedValue([{ created_at, status: 'DELIVERED' }]);
  (prisma.orderNotification.findMany as jest.Mock).mockResolvedValue([{ created_at, status: 'DELIVERED' }, { created_at, status: 'FAILED' }, { created_at, status: 'QUEUED' }]);
  (prisma.notification.findMany as jest.Mock).mockResolvedValue([{ status: 'DELIVERED', sent_at: created_at, delivery: { created_at } }]);
  const result = await getPlatformAnalytics('TODAY');
  expect(result.summary).toMatchObject({ orders: 3, dispatches: 4, delivered: 3, sales: 150, cost: 120, profit: -20, refunds: 100, missingCostCount: 1 });
  expect(result.notifications).toMatchObject({ total: 4, delivered: 2, failed: 1, queued: 1, deliveryRate: 66.7 });
  for (const [key, expected] of [['sales', 150], ['profit', -20], ['orders', 3], ['delivered', 3], ['smsDelivered', 2], ['smsFailed', 1]] as const) expect(result.trend.reduce((sum, point) => sum + point[key], 0)).toBe(expected);
  expect(prisma.delivery.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ order: { is: null } }) }));
  const ordersQuery = (prisma.order.findMany as jest.Mock).mock.calls[0][0];
  const smsQuery = (prisma.orderNotification.findMany as jest.Mock).mock.calls[0][0];
  expect(ordersQuery.where.created_at).toEqual(smsQuery.where.created_at);
});
