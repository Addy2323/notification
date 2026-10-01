import { prisma } from '../database/prisma';

export interface ScoringWeights {
  orderActivityWeight: number; // default 0.40
  completionRateWeight: number; // default 0.25
  consistencyWeight: number; // default 0.15
  driverUsageWeight: number; // default 0.10
  notificationSuccessWeight: number; // default 0.10
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  orderActivityWeight: 0.40,
  completionRateWeight: 0.25,
  consistencyWeight: 0.15,
  driverUsageWeight: 0.10,
  notificationSuccessWeight: 0.10,
};

export async function calculateMerchantScore(merchantId: string, period: string = 'THIS_MONTH', customWeights?: Partial<ScoringWeights>) {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // Calculate Date Boundaries
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

  // Fetch Merchant stats
  const [orders, deliveries, driversCount, notifications] = await Promise.all([
    prisma.order.findMany({
      where: {
        merchant_id: merchantId,
        created_at: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
        created_at: true,
      },
    }),
    prisma.delivery.findMany({
      where: {
        merchant_id: merchantId,
        created_at: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
      },
    }),
    prisma.driver.count({
      where: { merchant_id: merchantId },
    }),
    prisma.orderNotification.findMany({
      where: {
        order: { merchant_id: merchantId },
        created_at: { gte: startDate },
      },
      select: { status: true },
    }),
  ]);

  const ordersCount = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const failedOrders = orders.filter((o) => ['FAILED', 'CANCELLED'].includes(o.status)).length;
  const completionRate = ordersCount > 0 ? (completedOrders / ordersCount) * 100 : 100;

  // Active Days consistency
  const activeDaysSet = new Set(orders.map((o) => o.created_at.toISOString().split('T')[0]));
  const activeDays = activeDaysSet.size;

  // Notification success
  const totalNotifs = notifications.length;
  const deliveredNotifs = notifications.filter((n) => ['DELIVERED', 'SENT'].includes(n.status)).length;
  const notificationSuccessRate = totalNotifs > 0 ? (deliveredNotifs / totalNotifs) * 100 : 100;

  // Sub-scores normalization (0 to 100)
  // Order score benchmark: 100 orders = 100 points
  const orderScore = Math.min(100, (ordersCount / 50) * 100);
  const completionScore = Math.min(100, completionRate);
  // Consistency score benchmark: 20 active days = 100 points
  const consistencyScore = Math.min(100, (activeDays / 20) * 100);
  // Driver score benchmark: 3+ drivers = 100 points
  const driverScore = Math.min(100, (driversCount / 3) * 100);
  const notificationScore = Math.min(100, notificationSuccessRate);

  const finalScore = Math.round(
    orderScore * weights.orderActivityWeight +
      completionScore * weights.completionRateWeight +
      consistencyScore * weights.consistencyWeight +
      driverScore * weights.driverUsageWeight +
      notificationScore * weights.notificationSuccessWeight
  );

  // Save/Update in database
  const scoreRecord = await prisma.merchantScore.create({
    data: {
      merchant_id: merchantId,
      score: finalScore,
      order_score: Math.round(orderScore),
      completion_score: Math.round(completionScore),
      consistency_score: Math.round(consistencyScore),
      driver_score: Math.round(driverScore),
      notification_score: Math.round(notificationScore),
      period,
      active_days: activeDays,
      orders_count: ordersCount,
      completion_rate: parseFloat(completionRate.toFixed(1)),
    },
  });

  return {
    score: finalScore,
    orderScore: Math.round(orderScore),
    completionScore: Math.round(completionScore),
    consistencyScore: Math.round(consistencyScore),
    driverScore: Math.round(driverScore),
    notificationScore: Math.round(notificationScore),
    activeDays,
    ordersCount,
    completionRate: parseFloat(completionRate.toFixed(1)),
    driversCount,
    notificationSuccessRate: parseFloat(notificationSuccessRate.toFixed(1)),
    period,
    calculatedAt: scoreRecord.calculated_at,
  };
}

export async function getMerchantStreak(merchantId: string) {
  const orders = await prisma.order.findMany({
    where: { merchant_id: merchantId },
    select: { created_at: true },
    orderBy: { created_at: 'desc' },
  });

  if (orders.length === 0) return 0;

  const activeDates = Array.from(new Set(orders.map((o) => o.created_at.toISOString().split('T')[0]))).sort().reverse();
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const dateStr of activeDates) {
    const d = new Date(dateStr);
    const diffTime = Math.abs(currentDate.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      streak++;
      currentDate = d;
    } else {
      break;
    }
  }

  return streak;
}
