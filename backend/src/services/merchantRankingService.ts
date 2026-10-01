import { prisma } from '../database/prisma';
import { calculateMerchantScore } from './merchantScoringService';

export type RankingMetric = 'SCORE' | 'ORDERS' | 'SALES' | 'DELIVERIES' | 'COMPLETION' | 'GROWTH';

export async function getMerchantRankings(period: string = 'THIS_MONTH', metric: RankingMetric = 'SCORE', limit: number = 50) {
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

  const merchants = await prisma.merchant.findMany({
    where: { status: { in: ['ACTIVE', 'SUSPENDED'] } },
    select: {
      id: true,
      business_name: true,
      business_phone: true,
      email: true,
      logo_url: true,
      brand_color: true,
      created_at: true,
      orders: {
        where: { created_at: { gte: startDate } },
        select: {
          id: true,
          amount: true,
          total_revenue: true,
          status: true,
          created_at: true,
        },
      },
      deliveries: {
        where: { created_at: { gte: startDate } },
        select: { id: true, status: true },
      },
      drivers: {
        select: { id: true },
      },
    },
  });

  const rankedList = await Promise.all(
    merchants.map(async (m) => {
      const ordersCount = m.orders.length;
      const completedOrders = m.orders.filter((o) => o.status === 'DELIVERED').length;
      const completionRate = ordersCount > 0 ? (completedOrders / ordersCount) * 100 : 100;
      const totalSales = m.orders.reduce((sum, o) => sum + Number(o.total_revenue || o.amount || 0), 0);
      const deliveryCount = m.deliveries.length;
      const driverCount = m.drivers.length;

      // Active days
      const activeDays = new Set(m.orders.map((o) => o.created_at.toISOString().split('T')[0])).size;

      // Score
      const scoreObj = await calculateMerchantScore(m.id, period);

      return {
        merchantId: m.id,
        businessName: m.business_name,
        businessPhone: m.business_phone,
        email: m.email,
        logoUrl: m.logo_url,
        brandColor: m.brand_color,
        joinedAt: m.created_at,
        ordersCount,
        completedOrders,
        completionRate: parseFloat(completionRate.toFixed(1)),
        totalSales,
        deliveryCount,
        driverCount,
        activeDays,
        score: scoreObj.score,
        orderScore: scoreObj.orderScore,
        completionScore: scoreObj.completionScore,
        consistencyScore: scoreObj.consistencyScore,
      };
    })
  );

  // Sort based on requested metric
  rankedList.sort((a, b) => {
    if (metric === 'ORDERS') return b.ordersCount - a.ordersCount;
    if (metric === 'SALES') return b.totalSales - a.totalSales;
    if (metric === 'DELIVERIES') return b.deliveryCount - a.deliveryCount;
    if (metric === 'COMPLETION') return b.completionRate - a.completionRate;
    return b.score - a.score;
  });

  return rankedList.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    ...item,
  }));
}

export async function checkAndAwardAchievements(merchantId: string) {
  const ordersCount = await prisma.order.count({ where: { merchant_id: merchantId } });

  const existing = await prisma.merchantAchievement.findMany({
    where: { merchant_id: merchantId },
    select: { achievement_key: true },
  });

  const existingKeys = new Set(existing.map((e) => e.achievement_key));
  const newAchievements = [];

  if (ordersCount >= 10 && !existingKeys.has('FIRST_10_ORDERS')) {
    newAchievements.push({
      merchant_id: merchantId,
      achievement_key: 'FIRST_10_ORDERS',
      title: 'Getting Started',
      description: 'Reached 10 completed orders milestone',
      badge_icon: 'rocket',
    });
  }
  if (ordersCount >= 100 && !existingKeys.has('100_ORDERS')) {
    newAchievements.push({
      merchant_id: merchantId,
      achievement_key: '100_ORDERS',
      title: '100 Orders Milestone',
      description: 'Processed over 100 platform orders',
      badge_icon: 'award',
    });
  }
  if (ordersCount >= 500 && !existingKeys.has('500_ORDERS')) {
    newAchievements.push({
      merchant_id: merchantId,
      achievement_key: '500_ORDERS',
      title: 'Growth Merchant',
      description: 'Achieved 500 orders benchmark',
      badge_icon: 'trending-up',
    });
  }
  if (ordersCount >= 1000 && !existingKeys.has('1000_ORDERS')) {
    newAchievements.push({
      merchant_id: merchantId,
      achievement_key: '1000_ORDERS',
      title: 'LUMO Power Merchant',
      description: 'Surpassed 1,000 orders platform benchmark',
      badge_icon: 'zap',
    });
  }

  if (newAchievements.length > 0) {
    await prisma.merchantAchievement.createMany({
      data: newAchievements,
    });
  }

  return prisma.merchantAchievement.findMany({
    where: { merchant_id: merchantId },
    orderBy: { granted_at: 'desc' },
  });
}
