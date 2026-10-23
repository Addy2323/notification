jest.mock('../database/prisma', () => ({ prisma: {
  order: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  delivery: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() }
} }));
import { prisma } from '../database/prisma';
import { listAdminDeliveries, deliveryWhere, getAdminDelivery } from '../services/adminDeliveryService';

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.order.count as jest.Mock).mockResolvedValue(2);
  (prisma.delivery.count as jest.Mock).mockResolvedValue(1);
  (prisma.order.findMany as jest.Mock).mockResolvedValue([
    { id: 'new', order_number: 'LUMO-1', product_name: 'Phone', created_at: new Date('2026-10-23') },
    { id: 'old', order_number: 'LUMO-2', product_name: 'Shirt', created_at: new Date('2026-10-21') }
  ]);
  (prisma.delivery.findMany as jest.Mock).mockResolvedValue([{ id: 'legacy', product_description: 'Parcel', created_at: new Date('2026-10-22') }]);
});
it('merges sources into chronological pages with accurate counts', async () => {
  const result = await listAdminDeliveries({ page: 2, limit: 1 });
  expect(result.deliveries.map(row => row.id)).toEqual(['legacy']);
  expect(result.deliveries[0]).toMatchObject({ source: 'DELIVERY', reference: 'DEL-legacy', product_description: 'Parcel' });
  expect(result.pagination).toMatchObject({ total: 3, totalPages: 3 });
  expect(prisma.delivery.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { order: { is: null } }, take: 2 }));
});
it('filters legacy duplicates out and maps delivery status variants', () => {
  const where = deliveryWhere({ page: 1, limit: 25, status: 'IN_TRANSIT', search: ' Phone ' }, 'DELIVERY');
  expect(where).toMatchObject({ order: { is: null }, status: { in: ['OUT_FOR_DELIVERY', 'STARTED', 'ON_THE_WAY'] } });
  expect(where.OR).toContainEqual({ product_description: { contains: 'Phone', mode: 'insensitive' } });
  expect(where.OR).toContainEqual({ merchant: { business_name: { contains: 'Phone', mode: 'insensitive' } } });
});
it('only queries the selected source and preserves real order statuses', async () => {
  const result = await listAdminDeliveries({ page: 1, limit: 25, source: 'ORDER', status: 'DELIVERED' });
  expect(prisma.delivery.findMany).not.toHaveBeenCalled();
  expect(prisma.delivery.count).not.toHaveBeenCalled();
  expect(prisma.order.count).toHaveBeenCalledWith({ where: { status: 'DELIVERED' } });
  expect(result.deliveries[0]).toMatchObject({ source: 'ORDER', reference: 'LUMO-1', product_description: 'Phone' });
});
it('selects timeline details without exposing driver or tracking tokens', async () => {
  (prisma.delivery.findUnique as jest.Mock).mockResolvedValue(null);
  expect(await getAdminDelivery('DELIVERY', 'missing')).toBeNull();
  const query = (prisma.delivery.findUnique as jest.Mock).mock.calls[0][0];
  expect(query.where).toEqual({ id: 'missing' });
  expect(query.select.events.orderBy).toEqual({ timestamp: 'asc' });
  expect(query.select.driver_token).toBeUndefined();
  expect(query.select.tracking_token).toBeUndefined();
});
