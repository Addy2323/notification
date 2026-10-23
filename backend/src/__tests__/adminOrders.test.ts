jest.mock('../database/prisma', () => ({ prisma: { order: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() } } }));
import { prisma } from '../database/prisma';
import { listGlobalOrders, getGlobalOrder } from '../services/adminOrderService';
import { requireRole } from '../middleware/auth';

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.order.count as jest.Mock).mockResolvedValue(31);
  (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
});
it('loads all orders without a default search and paginates at the database', async () => {
  const result = await listGlobalOrders({ page: 2, limit: 25, status: 'ALL' });
  expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 25, take: 25 }));
  expect(result.pagination).toMatchObject({ total: 31, totalPages: 2, page: 2 });
});
it('combines real order statuses, merchant scope and search for rows and count', async () => {
  await listGlobalOrders({ page: 1, limit: 25, search: ' Phone ', merchantId: 'merchant', status: 'OUT_FOR_DELIVERY' });
  const query = (prisma.order.findMany as jest.Mock).mock.calls[0][0];
  expect(query.where).toMatchObject({ merchant_id: 'merchant', status: 'OUT_FOR_DELIVERY', OR: expect.arrayContaining([{ product_name: { contains: 'Phone', mode: 'insensitive' } }, { merchant: { business_name: { contains: 'Phone', mode: 'insensitive' } } }]) });
  expect(prisma.order.count).toHaveBeenCalledWith({ where: query.where });
});
it('supports refunded orders with net financial figures', async () => {
  (prisma.order.findMany as jest.Mock).mockResolvedValue([{ total_revenue: 100, total_cost: 60, payment_status: 'REFUNDED', events: [] }]);
  const result = await listGlobalOrders({ page: 1, limit: 25, status: 'REFUNDED' });
  expect(prisma.order.count).toHaveBeenCalledWith({ where: { payment_status: 'REFUNDED' } });
  expect(result.orders[0]).toMatchObject({ net_revenue: 0, net_profit: -60, refund_amount: 100 });
});
it('loads detail relations without selecting authentication or tracking tokens', async () => {
  (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
  expect(await getGlobalOrder('missing')).toBeNull();
  const query = (prisma.order.findUnique as jest.Mock).mock.calls[0][0];
  expect(query.where).toEqual({ id: 'missing' });
  expect(query.select).toMatchObject({ items: true, events: expect.any(Object), notifications: expect.any(Object) });
  expect(query.select.tracking_token).toBeUndefined();
  expect(query.select.driver_token).toBeUndefined();
});
it('rejects merchant access and allows administrators through the role guard', () => {
  const next = jest.fn();
  const response: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  requireRole(['ADMIN'])({ user: { role: 'MERCHANT' } } as any, response, next);
  expect(response.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
  requireRole(['ADMIN'])({ user: { role: 'ADMIN' } } as any, response, next);
  expect(next).toHaveBeenCalledTimes(1);
});
