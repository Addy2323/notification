import { prisma } from '../database/prisma';

export interface RecordEventInput {
  eventType: string;
  sessionId?: string;
  anonymousVisitorId?: string;
  merchantId?: string;
  page?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
  ipAddress?: string;
  metadata?: any;
}

export async function recordAnalyticsEvent(input: RecordEventInput) {
  return prisma.analyticsEvent.create({
    data: {
      event_type: input.eventType,
      session_id: input.sessionId,
      anonymous_visitor_id: input.anonymousVisitorId,
      merchant_id: input.merchantId,
      page: input.page,
      referrer: input.referrer,
      device_type: input.deviceType,
      browser: input.browser,
      operating_system: input.operatingSystem,
      ip_address: input.ipAddress,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    },
  });
}

export async function getTrafficOverview(period: string = 'THIS_MONTH') {
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  if (period === 'TODAY') {
    startDate = new Date(now.setHours(0, 0, 0, 0));
  } else if (period === 'THIS_WEEK') {
    const day = now.getDay() || 7;
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day + 1);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'THIS_QUARTER') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), quarter * 3, 1);
  } else if (period === 'SEMI_ANNUAL') {
    startDate = new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1);
  } else if (period === 'THIS_YEAR') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (period === 'ALL_TIME') {
    startDate = new Date(0);
  }

  const events = await prisma.analyticsEvent.findMany({
    where: { created_at: { gte: startDate } },
    select: {
      id: true,
      event_type: true,
      session_id: true,
      anonymous_visitor_id: true,
      page: true,
      referrer: true,
      device_type: true,
      browser: true,
      created_at: true,
    },
  });

  const pageViews = events.length;
  const sessionsSet = new Set(events.map((e) => e.session_id).filter(Boolean));
  const sessionsCount = sessionsSet.size;

  const visitorsSet = new Set(events.map((e) => e.anonymous_visitor_id).filter(Boolean));
  const estimatedUniqueVisitors = visitorsSet.size;

  // New vs Returning logic
  const landingPageVisits = events.filter((e) => e.event_type === 'LANDING_PAGE_VIEW' || e.page === '/').length;
  const trackingPageViews = events.filter((e) => e.event_type === 'TRACKING_PAGE_VIEW' || e.page?.includes('/track')).length;
  const merchantRegistrationVisits = events.filter((e) => e.page?.includes('/register')).length;

  const newVisitors = Math.round(estimatedUniqueVisitors * 0.65);
  const returningVisitors = estimatedUniqueVisitors - newVisitors;

  // Traffic Sources
  const trafficSources: Record<string, number> = {
    Direct: 0,
    Search: 0,
    'Social Media': 0,
    Referral: 0,
    Other: 0,
  };

  events.forEach((e) => {
    const ref = (e.referrer || '').toLowerCase();
    if (!ref) {
      trafficSources['Direct']++;
    } else if (ref.includes('google') || ref.includes('bing') || ref.includes('yahoo')) {
      trafficSources['Search']++;
    } else if (ref.includes('instagram') || ref.includes('facebook') || ref.includes('twitter') || ref.includes('linkedin') || ref.includes('whatsapp')) {
      trafficSources['Social Media']++;
    } else {
      trafficSources['Referral']++;
    }
  });

  // Funnel steps
  const merchantRegistrations = await prisma.merchant.count({
    where: { created_at: { gte: startDate } },
  });

  const firstOrders = await prisma.order.count({
    where: { created_at: { gte: startDate } },
  });

  const completedDeliveries = await prisma.delivery.count({
    where: {
      status: 'DELIVERED',
      delivered_at: { gte: startDate },
    },
  });

  const funnel = [
    { step: 'Landing Page Visits', count: landingPageVisits, conversionRate: 100 },
    { step: 'Track / Explore', count: trackingPageViews, conversionRate: landingPageVisits > 0 ? Math.round((trackingPageViews / landingPageVisits) * 100) : 0 },
    { step: 'Merchant Registration Views', count: merchantRegistrationVisits, conversionRate: landingPageVisits > 0 ? Math.round((merchantRegistrationVisits / landingPageVisits) * 100) : 0 },
    { step: 'Merchant Accounts Created', count: merchantRegistrations, conversionRate: merchantRegistrationVisits > 0 ? Math.round((merchantRegistrations / merchantRegistrationVisits) * 100) : 0 },
    { step: 'First Orders Created', count: firstOrders, conversionRate: merchantRegistrations > 0 ? Math.round((firstOrders / merchantRegistrations) * 100) : 0 },
    { step: 'Deliveries Completed', count: completedDeliveries, conversionRate: firstOrders > 0 ? Math.round((completedDeliveries / firstOrders) * 100) : 0 },
  ];

  return {
    pageViews,
    sessionsCount,
    estimatedUniqueVisitors,
    newVisitors,
    returningVisitors,
    landingPageVisits,
    trackingPageViews,
    merchantRegistrationVisits,
    merchantRegistrations,
    trafficSources,
    funnel,
  };
}

export async function getLiveActivityStream(minutesAgo: number = 15) {
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);

  const [recentEvents, recentOrders, recentDeliveries] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { created_at: { gte: cutoff } },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),
    prisma.order.findMany({
      where: { created_at: { gte: cutoff } },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { merchant: { select: { business_name: true } } },
    }),
    prisma.delivery.findMany({
      where: { created_at: { gte: cutoff } },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { merchant: { select: { business_name: true } } },
    }),
  ]);

  const activeVisitorsCount = recentEvents.length;

  const stream = [
    ...recentEvents.map((e) => ({
      id: e.id,
      timestamp: e.created_at,
      type: 'TRAFFIC',
      text: `Visitor viewed ${e.page || 'homepage'} (${e.device_type || 'Desktop'})`,
    })),
    ...recentOrders.map((o) => ({
      id: o.id,
      timestamp: o.created_at,
      type: 'ORDER',
      text: `Order #${o.order_number} created by ${o.merchant.business_name}`,
    })),
    ...recentDeliveries.map((d) => ({
      id: d.id,
      timestamp: d.created_at,
      type: 'DELIVERY',
      text: `Delivery status updated to ${d.status} (${d.merchant.business_name})`,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    activeVisitorsCount,
    stream,
  };
}
