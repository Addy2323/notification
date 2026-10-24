jest.mock('../database/prisma', () => ({ prisma: { $transaction: jest.fn(), order: { count: jest.fn(), findMany: jest.fn() } } }));
jest.mock('../notifications/orderNotificationEngine', () => ({ dispatchOrderEvent: jest.fn() }));
import { prisma } from '../database/prisma';
import { refundOrder, listOrders } from '../services/orderService';
const version = '2026-10-23T12:00:00.000Z';
let tx: any;
beforeEach(() => {
  tx = { order: { findFirst: jest.fn().mockResolvedValue({ id: 'order', status: 'DELIVERED', updated_at: new Date(version), total_revenue: 100 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn().mockResolvedValue({ id: 'order', payment_status: 'REFUNDED' }) }, orderEvent: { create: jest.fn() } };
  (prisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(tx));
});
it('records the refund status and reason with merchant ownership and concurrency checks', async () => {
  expect(await refundOrder('merchant', 'user', 'order', { reason: 'Returned goods', restocked: true, updatedAt: version })).toMatchObject({ payment_status: 'REFUNDED' });
  expect(tx.order.findFirst).toHaveBeenCalledWith({ where: { id: 'order', merchant_id: 'merchant' } });
  expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ merchant_id: 'merchant', status: 'DELIVERED', updated_at: new Date(version), payment_status: { not: 'REFUNDED' } }), data: { payment_status: 'REFUNDED' } }));
  expect(JSON.parse(tx.orderEvent.create.mock.calls[0][0].data.metadata)).toEqual({ reason: 'Returned goods', restocked: true, amount: 100 });
});
it('rejects repeat refunds without a second refund event', async () => {
  tx.order.updateMany.mockResolvedValue({ count: 0 });
  await expect(refundOrder('merchant', 'user', 'order', { reason: 'Return', restocked: false })).rejects.toThrow('already been refunded');
  expect(tx.orderEvent.create).not.toHaveBeenCalled();
});
it('rejects other merchants orders, non-delivered orders and stale form versions', async () => {
  tx.order.findFirst.mockResolvedValueOnce(null);
  await expect(refundOrder('merchant', 'user', 'order', { reason: 'Return', restocked: false })).rejects.toThrow('not found');
  tx.order.findFirst.mockResolvedValueOnce({ status: 'CANCELLED' });
  await expect(refundOrder('merchant', 'user', 'order', { reason: 'Return', restocked: false })).rejects.toThrow('Only delivered');
  await expect(refundOrder('merchant', 'user', 'order', { reason: 'Return', restocked: false, updatedAt: '2026-10-22T12:00:00.000Z' })).rejects.toThrow('order changed');
  expect(tx.order.updateMany).not.toHaveBeenCalled();
});
it('filters merchant orders by refund payment status rather than delivery status', async () => {
  (prisma.order.count as jest.Mock).mockResolvedValue(1);
  (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
  await listOrders('merchant', { status: 'REFUNDED' });
  expect(prisma.order.count).toHaveBeenCalledWith({ where: { merchant_id: 'merchant', payment_status: 'REFUNDED' } });
});
