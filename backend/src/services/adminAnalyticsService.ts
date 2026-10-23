import { prisma } from '../database/prisma';
import { profileDateRange, ProfilePeriod } from '../utils/profilePeriod';
import { ledgerFinancials } from './salesService';

export async function getPlatformAnalytics(period: ProfilePeriod = 'THIS_MONTH') {
  const now = new Date();
  const range = profileDateRange(period, now);
  const dateWhere = range ? { created_at: range } : {};
  const [orders, deliveries, orderMessages, legacyMessages, merchants] = await Promise.all([
    prisma.order.findMany({ where: dateWhere, select: { created_at: true, status: true, merchant_id: true, amount: true, total_revenue: true, total_cost: true, payment_status: true, events: { where: { event_type: 'ORDER_REFUNDED' }, select: { event_type: true, metadata: true } } } }),
    prisma.delivery.findMany({ where: { ...dateWhere, order: { is: null } }, select: { created_at: true, status: true } }),
    prisma.orderNotification.findMany({ where: dateWhere, select: { created_at: true, status: true } }),
    prisma.notification.findMany({ where: { delivery: { order: { is: null } }, ...(range ? { OR: [{ sent_at: range }, { sent_at: null, delivery: { order: { is: null }, created_at: range } }] } : {}) }, select: { status: true, sent_at: true, delivery: { select: { created_at: true } } } }),
    prisma.merchant.groupBy({ by: ['status'], _count: { _all: true } })
  ]);
  // Legacy notifications have no creation timestamp; use their dispatch time,
  // falling back to the delivery creation time for messages still queued.
  const messages = [...orderMessages, ...legacyMessages.map(message => ({ status: message.status, created_at: message.sent_at ?? message.delivery.created_at })).filter(message => !range || (message.created_at >= range.gte && message.created_at <= range.lte))];
  const dispatches = [...orders, ...deliveries];
  const statuses = (rows: { status: string }[]) => rows.reduce<Record<string, number>>((counts, row) => { counts[row.status] = (counts[row.status] || 0) + 1; return counts; }, {});
  const sms = statuses(messages);
  const sent = (sms.SENT || 0) + (sms.DELIVERED || 0);
  const attempted = sent + (sms.FAILED || 0);
  const financials = orders.map(ledgerFinancials);
  const bucketKey = (date: Date) => period === 'TODAY' ? `${String(date.getHours()).padStart(2, '0')}:00` : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const buckets = new Map<string, { label: string; orders: number; delivered: number; sales: number; profit: number; smsDelivered: number; smsFailed: number }>();
  const getBucket = (date: Date) => {
    const label = bucketKey(date);
    if (!buckets.has(label)) buckets.set(label, { label, orders: 0, delivered: 0, sales: 0, profit: 0, smsDelivered: 0, smsFailed: 0 });
    return buckets.get(label)!;
  };
  let start = range?.gte;
  if (!start) {
    const dates = [...dispatches.map(row => row.created_at), ...messages.map(row => row.created_at)];
    start = dates.length ? new Date(dates.reduce((min, date) => Math.min(min, date.getTime()), now.getTime())) : now;
  }
  const cursor = new Date(start); cursor.setHours(0, 0, 0, 0);
  if (period === 'TODAY') {
    for (let hour = 0; hour < 24; hour++) { const date = new Date(cursor); date.setHours(hour); getBucket(date); }
  } else {
    while (cursor <= now) { getBucket(cursor); cursor.setDate(cursor.getDate() + 1); }
  }
  for (const order of orders) {
    const bucket = getBucket(order.created_at); const f = ledgerFinancials(order);
    bucket.orders++; bucket.sales += f.net_revenue; bucket.profit += f.net_profit ?? 0;
  }
  for (const dispatch of dispatches) if (dispatch.status === 'DELIVERED') getBucket(dispatch.created_at).delivered++;
  for (const message of messages) { const bucket = getBucket(message.created_at); if (message.status === 'DELIVERED') bucket.smsDelivered++; if (message.status === 'FAILED') bucket.smsFailed++; }
  return {
    period: { range: period, start: start, end: now, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    merchants: { total: merchants.reduce((sum, group) => sum + group._count._all, 0), active: merchants.filter(group => group.status === 'ACTIVE').reduce((sum, group) => sum + group._count._all, 0), engaged: new Set(orders.map(order => order.merchant_id)).size },
    summary: { orders: orders.length, dispatches: dispatches.length, delivered: dispatches.filter(row => row.status === 'DELIVERED').length, sales: financials.reduce((sum, f) => sum + f.net_revenue, 0), cost: financials.reduce((sum, f) => sum + (f.net_cost ?? 0), 0), profit: financials.reduce((sum, f) => sum + (f.net_profit ?? 0), 0), refunds: financials.reduce((sum, f) => sum + f.refund_amount, 0), missingCostCount: financials.filter(f => f.net_cost === null).length },
    notifications: { total: messages.length, delivered: sms.DELIVERED || 0, sent, failed: sms.FAILED || 0, queued: sms.QUEUED || 0, deliveryRate: attempted ? Math.round((sms.DELIVERED || 0) / attempted * 1000) / 10 : null },
    dispatchStatuses: statuses(dispatches), notificationStatuses: sms,
    trend: [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
  };
}
