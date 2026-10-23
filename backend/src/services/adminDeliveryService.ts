import { prisma } from '../database/prisma';

export interface DeliveryFilters { page: number; limit: number; search?: string; status?: string; source?: string }
const fields = { id: true, merchant_id: true, customer_phone: true, delivery_address: true, driver_name: true, driver_phone: true, status: true, created_at: true, delivered_at: true, merchant: { select: { id: true, business_name: true } } } as const;
const orderFields = { ...fields, order_number: true, customer_name: true, product_name: true, assigned_at: true, out_for_delivery_at: true, arrived_at: true, cancelled_at: true } as const;
const deliveryFields = { ...fields, product_description: true, started_at: true, arrived_at: true } as const;
export function deliveryWhere(options: DeliveryFilters, source: 'ORDER' | 'DELIVERY') {
  const where: any = source === 'DELIVERY' ? { order: { is: null } } : {};
  if (options.status && options.status !== 'ALL') {
    const groups: Record<string, string[]> = {
      PENDING: ['PENDING', 'CREATED', 'CONFIRMED', 'DRIVER_ASSIGNED'],
      IN_TRANSIT: ['OUT_FOR_DELIVERY', 'STARTED', 'ON_THE_WAY'],
      ARRIVED: ['ARRIVED', 'DRIVER_NEARBY'],
      FAILED: ['FAILED', 'CANCELLED']
    };
    where.status = groups[options.status] ? { in: groups[options.status] } : options.status;
  }
  const search = options.search?.trim();
  if (search) where.OR = [
    ...['id', 'customer_phone', 'delivery_address', 'driver_name', 'driver_phone', ...(source === 'ORDER' ? ['order_number', 'customer_name', 'product_name'] : ['product_description'])].map(field => ({ [field]: { contains: search, mode: 'insensitive' } })),
    { merchant: { business_name: { contains: search, mode: 'insensitive' } } }
  ];
  return where;
}
function normalize(record: any, source: 'ORDER' | 'DELIVERY') {
  return { ...record, source, reference: source === 'ORDER' ? record.order_number : `DEL-${record.id}`, product_description: source === 'ORDER' ? record.product_name : record.product_description };
}
export async function listAdminDeliveries(options: DeliveryFilters) {
  const orderWhere = deliveryWhere(options, 'ORDER');
  const legacyWhere = deliveryWhere(options, 'DELIVERY');
  const useOrders = options.source !== 'DELIVERY';
  const useLegacy = options.source !== 'ORDER';
  // Each source supplies its first N rows; merging them yields the exact global page.
  const take = options.page * options.limit;
  const orderBy: any = [{ created_at: 'desc' }, { id: 'desc' }];
  const [orderCount, legacyCount, orders, legacy] = await Promise.all([
    useOrders ? prisma.order.count({ where: orderWhere }) : 0,
    useLegacy ? prisma.delivery.count({ where: legacyWhere }) : 0,
    useOrders ? prisma.order.findMany({ where: orderWhere, select: orderFields, orderBy, take }) : [],
    useLegacy ? prisma.delivery.findMany({ where: legacyWhere, select: deliveryFields, orderBy, take }) : []
  ]);
  const total = orderCount + legacyCount;
  const rows = [...orders.map(row => normalize(row, 'ORDER')), ...legacy.map(row => normalize(row, 'DELIVERY'))].sort((a, b) => b.created_at.getTime() - a.created_at.getTime() || b.id.localeCompare(a.id) || b.source.localeCompare(a.source));
  return { deliveries: rows.slice((options.page - 1) * options.limit, take), pagination: { total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) } };
}
export async function getAdminDelivery(source: 'ORDER' | 'DELIVERY', id: string) {
  const events = { orderBy: { timestamp: 'asc' as const }, select: { id: true, event_type: true, actor_type: true, timestamp: true } };
  const row = source === 'ORDER'
    ? await prisma.order.findUnique({ where: { id }, select: { ...orderFields, events } })
    : await prisma.delivery.findUnique({ where: { id }, select: { ...deliveryFields, events } });
  return row ? normalize(row, source) : null;
}
