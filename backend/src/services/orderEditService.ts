import { z } from 'zod';
import { prisma } from '../database/prisma';
import { isValidPhone, normalizePhone } from '../utils/phone';
import { generateDriverToken } from '../utils/token';

const money = z.number().finite().nonnegative().max(9999999999.99).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, 'Use at most two decimal places');
export const orderEditSchema = z.object({
  updatedAt: z.string().datetime(),
  driverName: z.string().trim().max(150).optional(),
  driverPhone: z.string().trim().max(30).optional(),
  imageUrl: z.string().max(7 * 1024 * 1024).nullable().optional().refine(v => !v || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || /^https?:\/\//.test(v), 'Choose a valid product image'),
  items: z.array(z.object({ id: z.string().optional(), unitSellingPrice: money, unitCostPrice: money.nullable(), quantity: z.number().int().min(1).max(100000), discount: money }).refine(item => item.discount <= item.unitSellingPrice * item.quantity, 'Discount exceeds selling total')).min(1).max(100).optional()
}).strict().refine(v => (v.driverName === undefined && v.driverPhone === undefined) || (!!v.driverName && !!v.driverPhone && isValidPhone(v.driverPhone)), 'Enter both driver name and a valid Tanzanian phone number');
export type OrderEditInput = z.infer<typeof orderEditSchema>;
export class OrderEditError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const activeStatuses = ['DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVED'];
const cents = (v: number) => Math.round(v * 100);
export function calculateEditedItems(items: NonNullable<OrderEditInput['items']>) {
  let revenue = 0, cost = 0;
  let known = true;
  const lines = items.map(item => {
    const subtotal = cents(item.unitSellingPrice) * item.quantity - cents(item.discount);
    const lineCost = item.unitCostPrice === null ? null : cents(item.unitCostPrice) * item.quantity;
    revenue += subtotal; cost += lineCost ?? 0; known = known && lineCost !== null;
    if (subtotal > 999999999999 || (lineCost ?? 0) > 999999999999) throw new OrderEditError('Line total exceeds the supported amount');
    return { unit_selling_price: item.unitSellingPrice, unit_cost_price: item.unitCostPrice, quantity: item.quantity, discount: item.discount, subtotal: subtotal / 100, profit_amount: lineCost === null ? null : (subtotal - lineCost) / 100 };
  });
  if (revenue > 999999999999 || cost > 999999999999) throw new OrderEditError('Order total exceeds the supported amount');
  return { lines, amount: revenue / 100, total_revenue: revenue / 100, total_cost: known ? cost / 100 : null, gross_profit: known ? (revenue - cost) / 100 : null };
}
async function releaseDriver(tx: any, merchantId: string, driverId: string | null) {
  if (!driverId) return;
  const remaining = await tx.order.count({ where: { merchant_id: merchantId, driver_id: driverId, status: { in: activeStatuses } } });
  if (!remaining) await tx.driver.updateMany({ where: { id: driverId, merchant_id: merchantId, status: 'ON_DELIVERY' }, data: { status: 'AVAILABLE' } });
}
export async function editOrder(merchantId: string, userId: string, id: string, input: OrderEditInput) {
  return prisma.$transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id, merchant_id: merchantId }, include: { items: true } });
    if (!order) throw new OrderEditError('Order not found', 404);
    if (input.items && order.payment_status === 'REFUNDED') throw new OrderEditError('Prices on a refunded order cannot be changed');
    const claim = await tx.order.updateMany({ where: { id, merchant_id: merchantId, updated_at: new Date(input.updatedAt) }, data: { updated_at: new Date() } });
    if (claim.count !== 1) throw new OrderEditError('This order changed. Close the editor and reopen it before saving.', 409);
    const data: any = {};
    if (input.imageUrl !== undefined) data.image_url = input.imageUrl || null;
    if (input.driverName && input.driverPhone) {
      const phone = normalizePhone(input.driverPhone);
      const driver = await tx.driver.upsert({ where: { merchant_id_phone: { merchant_id: merchantId, phone } }, create: { merchant_id: merchantId, name: input.driverName, phone }, update: { name: input.driverName } });
      data.driver_id = driver.id; data.driver_name = input.driverName; data.driver_phone = phone;
      if (!order.driver_token || phone !== normalizePhone(order.driver_phone || '')) data.driver_token = generateDriverToken();
      if (activeStatuses.includes(order.status)) await tx.driver.update({ where: { id: driver.id }, data: { status: 'ON_DELIVERY' } });
    }
    if (input.items) {
      if (order.items.length) {
        const ids = input.items.map(item => item.id);
        if (ids.length !== order.items.length || new Set(ids).size !== ids.length || order.items.some(item => !ids.includes(item.id))) throw new OrderEditError('Order line items changed. Reopen the editor.');
      } else if (input.items.length !== 1 || input.items[0].id) throw new OrderEditError('Invalid legacy order line');
      const { lines, ...totals } = calculateEditedItems(input.items);
      Object.assign(data, totals);
      for (let i = 0; i < lines.length; i++) {
        if (order.items.length) await tx.orderItem.update({ where: { id: input.items[i].id! }, data: lines[i] });
        else await tx.orderItem.create({ data: { ...lines[i], order_id: id, product_name_snapshot: order.product_name } });
      }
    }
    const updated = await tx.order.update({ where: { id }, data, include: { items: true } });
    if (order.delivery_id) await tx.delivery.updateMany({ where: { id: order.delivery_id, merchant_id: merchantId }, data: { ...(data.driver_name ? { driver_name: data.driver_name, driver_phone: data.driver_phone, ...(data.driver_token ? { driver_token: generateDriverToken() } : {}) } : {}) } });
    if (data.driver_id && data.driver_id !== order.driver_id) await releaseDriver(tx, merchantId, order.driver_id);
    const changes = { before: { driverName: order.driver_name, driverPhone: order.driver_phone, revenue: order.total_revenue, cost: order.total_cost, items: order.items.map(item => ({ id: item.id, price: item.unit_selling_price, cost: item.unit_cost_price, quantity: item.quantity, discount: item.discount })) }, after: { driverName: updated.driver_name, driverPhone: updated.driver_phone, revenue: updated.total_revenue, cost: updated.total_cost, items: updated.items.map(item => ({ id: item.id, price: item.unit_selling_price, cost: item.unit_cost_price, quantity: item.quantity, discount: item.discount })) }, imageChanged: input.imageUrl !== undefined };
    await tx.orderEvent.create({ data: { order_id: id, event_type: 'ORDER_EDITED', actor_type: 'MERCHANT', actor_reference: userId, metadata: JSON.stringify(changes) } });
    await tx.auditLog.create({ data: { merchant_id: merchantId, user_id: userId, action: 'ORDER_EDITED', object_type: 'ORDER', object_id: id, metadata: JSON.stringify(changes) } });
    return updated;
  });
}
export async function deleteOrder(merchantId: string, userId: string, id: string, updatedAt: string) {
  return prisma.$transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id, merchant_id: merchantId } });
    if (!order) throw new OrderEditError('Order not found', 404);
    const removed = await tx.order.deleteMany({ where: { id, merchant_id: merchantId, updated_at: new Date(updatedAt) } });
    if (removed.count !== 1) throw new OrderEditError('This order changed. Review it again before deleting.', 409);
    // Remove a linked legacy delivery too so it cannot reappear as a standalone dispatch.
    if (order.delivery_id) await tx.delivery.deleteMany({ where: { id: order.delivery_id, merchant_id: merchantId } });
    await releaseDriver(tx, merchantId, order.driver_id);
    await tx.auditLog.create({ data: { merchant_id: merchantId, user_id: userId, action: 'ORDER_DELETED', object_type: 'ORDER', object_id: id, metadata: JSON.stringify({ orderNumber: order.order_number, revenue: order.total_revenue ?? order.amount, cost: order.total_cost, status: order.status, paymentStatus: order.payment_status }) } });
    return { id, deleted: true };
  });
}
