import { prisma } from '../database/prisma';
import { ledgerFinancials } from './salesService';

const summaryFields = {
  id: true, order_number: true, merchant_id: true, customer_name: true, customer_phone: true,
  product_name: true, amount: true, total_revenue: true, total_cost: true, gross_profit: true,
  status: true, payment_status: true, created_at: true, driver_name: true,
  merchant: { select: { id: true, business_name: true } },
  events: { where: { event_type: 'ORDER_REFUNDED' }, select: { id: true, event_type: true, metadata: true, timestamp: true } }
} as const;

export async function listGlobalOrders(options: { search?: string; status?: string; merchantId?: string; page: number; limit: number }) {
  const where: any = {};
  if (options.merchantId) where.merchant_id = options.merchantId;
  if (options.status === 'REFUNDED') where.payment_status = 'REFUNDED';
  else if (options.status === 'ON_THE_WAY') where.status = { in: ['OUT_FOR_DELIVERY', 'ARRIVED'] };
  else if (options.status && options.status !== 'ALL') where.status = options.status;
  const search = options.search?.trim();
  if (search) where.OR = [
    ...['order_number', 'customer_name', 'customer_phone', 'product_name', 'driver_name', 'driver_phone'].map(field => ({ [field]: { contains: search, mode: 'insensitive' } })),
    { merchant: { business_name: { contains: search, mode: 'insensitive' } } },
    { items: { some: { product_name_snapshot: { contains: search, mode: 'insensitive' } } } }
  ];
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, select: summaryFields, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: (options.page - 1) * options.limit, take: options.limit })
  ]);
  return { orders: orders.map(order => ({ ...order, ...ledgerFinancials(order) })), pagination: { total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) } };
}

export async function getGlobalOrder(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, select: {
    ...summaryFields, delivery_address: true, driver_phone: true,
    items: true,
    events: { orderBy: { timestamp: 'asc' }, select: { id: true, event_type: true, actor_type: true, timestamp: true, metadata: true } },
    notifications: { orderBy: { created_at: 'desc' }, select: { id: true, event_type: true, recipient_type: true, status: true, created_at: true, failure_reason: true } }
  } });
  return order ? { ...order, ...ledgerFinancials(order) } : null;
}
