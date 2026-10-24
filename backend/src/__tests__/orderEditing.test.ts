jest.mock('../database/prisma', () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock('../utils/token', () => ({ generateDriverToken: () => 'new-driver-token' }));
import { prisma } from '../database/prisma';
import { calculateEditedItems, orderEditSchema, editOrder, deleteOrder } from '../services/orderEditService';

const version = '2026-10-23T12:00:00.000Z';
const line = { id: 'item', unitSellingPrice: 100, unitCostPrice: 60, quantity: 2, discount: 10 };
let tx: any;
let original: any;
beforeEach(() => {
  original = { id: 'order', merchant_id: 'merchant', order_number: 'LUMO-12345', product_name: 'Phone', driver_id: 'old-driver', driver_name: 'Old', driver_phone: '0712345678', driver_token: 'old-token', delivery_id: 'delivery', payment_status: 'UNPAID', status: 'OUT_FOR_DELIVERY', updated_at: new Date(version), total_revenue: 100, total_cost: 60, items: [{ id: 'item', unit_selling_price: 100, unit_cost_price: 60, quantity: 1, discount: 0 }] };
  tx = {
    order: { findFirst: jest.fn().mockImplementation(async () => original), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...original, ...data, items: original.items })), deleteMany: jest.fn().mockResolvedValue({ count: 1 }), count: jest.fn().mockResolvedValue(0) },
    orderItem: { update: jest.fn(), create: jest.fn() },
    driver: { upsert: jest.fn().mockResolvedValue({ id: 'new-driver' }), update: jest.fn(), updateMany: jest.fn() },
    delivery: { updateMany: jest.fn(), deleteMany: jest.fn() },
    orderEvent: { create: jest.fn() }, auditLog: { create: jest.fn() }
  };
  (prisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(tx));
});
it('calculates decimal totals, quantity, discounts, zero costs and losses', () => {
  expect(calculateEditedItems([line])).toMatchObject({ amount: 190, total_cost: 120, gross_profit: 70 });
  expect(calculateEditedItems([{ ...line, unitSellingPrice: 0.1, unitCostPrice: 0.2, quantity: 3, discount: 0 }])).toMatchObject({ amount: 0.3, total_cost: 0.6, gross_profit: -0.3 });
  expect(calculateEditedItems([{ ...line, unitCostPrice: 0 }]).gross_profit).toBe(190);
  expect(calculateEditedItems([{ ...line, unitCostPrice: null }]).gross_profit).toBeNull();
});
it('rejects malformed prices, phones, images and excessive totals', () => {
  expect(orderEditSchema.safeParse({ updatedAt: version, driverName: 'Driver', driverPhone: 'wrong' }).success).toBe(false);
  expect(orderEditSchema.safeParse({ updatedAt: version, items: [{ ...line, unitSellingPrice: -1 }] }).success).toBe(false);
  expect(orderEditSchema.safeParse({ updatedAt: version, items: [{ ...line, unitSellingPrice: 1.234 }] }).success).toBe(false);
  expect(orderEditSchema.safeParse({ updatedAt: version, imageUrl: 'javascript:alert(1)' }).success).toBe(false);
  expect(() => calculateEditedItems([{ ...line, unitSellingPrice: 9999999999, quantity: 2 }])).toThrow('total exceeds');
});
it('scopes edits and deletion to the authenticated merchant', async () => {
  tx.order.findFirst.mockResolvedValue(null);
  await expect(editOrder('merchant', 'user', 'other-order', { updatedAt: version })).rejects.toMatchObject({ status: 404 });
  await expect(deleteOrder('merchant', 'user', 'other-order', version)).rejects.toMatchObject({ status: 404 });
  expect(tx.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'other-order', merchant_id: 'merchant' } }));
  expect(tx.order.update).not.toHaveBeenCalled(); expect(tx.order.deleteMany).not.toHaveBeenCalled();
});
it('updates line prices and all financial fields, preserving line identities', async () => {
  await editOrder('merchant', 'user', 'order', { updatedAt: version, items: [line], imageUrl: null });
  expect(tx.orderItem.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'item' }, data: expect.objectContaining({ subtotal: 190, profit_amount: 70 }) }));
  expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 190, total_revenue: 190, total_cost: 120, gross_profit: 70, image_url: null }) }));
  expect(tx.orderEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ event_type: 'ORDER_EDITED' }) }));
});
it('rejects stale edits and line items from another order', async () => {
  tx.order.updateMany.mockResolvedValueOnce({ count: 0 });
  await expect(editOrder('merchant', 'user', 'order', { updatedAt: version, items: [line] })).rejects.toMatchObject({ status: 409 });
  expect(tx.orderItem.update).not.toHaveBeenCalled();
  await expect(editOrder('merchant', 'user', 'order', { updatedAt: version, items: [{ ...line, id: 'foreign-item' }] })).rejects.toThrow('line items changed');
});
it('links corrected driver details and updates a linked delivery without altering order status', async () => {
  await editOrder('merchant', 'user', 'order', { updatedAt: version, driverName: 'Correct Driver', driverPhone: '0788888888' });
  expect(tx.driver.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { merchant_id_phone: { merchant_id: 'merchant', phone: '+255788888888' } } }));
  const data = tx.order.update.mock.calls[0][0].data;
  expect(data).toMatchObject({ driver_id: 'new-driver', driver_name: 'Correct Driver', driver_phone: '+255788888888', driver_token: 'new-driver-token' });
  expect(data.status).toBeUndefined();
  expect(tx.delivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'delivery', merchant_id: 'merchant' }, data: expect.objectContaining({ driver_phone: '+255788888888' }) }));
  expect(tx.driver.updateMany).toHaveBeenCalled();
});
it('allows image corrections on refunded orders but prevents changing refunded prices', async () => {
  original.payment_status = 'REFUNDED';
  await expect(editOrder('merchant', 'user', 'order', { updatedAt: version, items: [line] })).rejects.toThrow('refunded');
  await editOrder('merchant', 'user', 'order', { updatedAt: version, imageUrl: null });
  expect(tx.order.update).toHaveBeenCalled();
});
it('deletes the scoped order and linked delivery and retains a deletion audit', async () => {
  expect(await deleteOrder('merchant', 'user', 'order', version)).toEqual({ id: 'order', deleted: true });
  expect(tx.order.deleteMany).toHaveBeenCalledWith({ where: { id: 'order', merchant_id: 'merchant', updated_at: new Date(version) } });
  expect(tx.delivery.deleteMany).toHaveBeenCalledWith({ where: { id: 'delivery', merchant_id: 'merchant' } });
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'ORDER_DELETED', merchant_id: 'merchant', object_id: 'order' }) }));
});
it('rejects stale deletion before touching linked records', async () => {
  tx.order.deleteMany.mockResolvedValue({ count: 0 });
  await expect(deleteOrder('merchant', 'user', 'order', version)).rejects.toMatchObject({ status: 409 });
  expect(tx.delivery.deleteMany).not.toHaveBeenCalled();
});
it('creates a priced line for legacy orders and retains busy drivers with other assignments', async () => {
  original.items = [];
  tx.order.count.mockResolvedValue(1);
  await editOrder('merchant', 'user', 'order', { updatedAt: version, driverName: 'Correct Driver', driverPhone: '0788888888', items: [{ ...line, id: undefined }] });
  expect(tx.orderItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ order_id: 'order', product_name_snapshot: 'Phone', subtotal: 190 }) }));
  expect(tx.driver.updateMany).not.toHaveBeenCalled();
});
