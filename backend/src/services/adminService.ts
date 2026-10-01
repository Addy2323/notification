import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma';
import { calculateMerchantScore, getMerchantStreak } from './merchantScoringService';
import { checkAndAwardAchievements } from './merchantRankingService';

export async function getAdminOverviewMetrics(period: string = 'THIS_MONTH', startDateInput?: string, endDateInput?: string) {
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = now;

  if (startDateInput) startDate = new Date(startDateInput);
  if (endDateInput) endDate = new Date(endDateInput);

  if (!startDateInput) {
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
    }
  }

  // Merchant breakdown
  const [
    totalMerchants,
    activeMerchants,
    suspendedMerchants,
    archivedMerchants,
    newMerchantsToday,
    newMerchantsWeek,
    newMerchantsMonth,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.merchant.count({ where: { status: 'SUSPENDED' } }),
    prisma.merchant.count({ where: { status: 'ARCHIVED' } }),
    prisma.merchant.count({ where: { created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.merchant.count({ where: { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.merchant.count({ where: { created_at: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
  ]);

  // Order stats
  const orders = await prisma.order.findMany({
    where: { created_at: { gte: startDate, lte: endDate } },
    select: {
      id: true,
      amount: true,
      total_revenue: true,
      total_cost: true,
      gross_profit: true,
      status: true,
      merchant_id: true,
    },
  });

  const totalOrders = orders.length;
  const totalSalesValue = orders.reduce((sum, o) => sum + Number(o.total_revenue || o.amount || 0), 0);
  const totalProductCost = orders.reduce((sum, o) => sum + Number(o.total_cost || 0), 0);
  const totalGrossProfit = orders.reduce((sum, o) => sum + Number(o.gross_profit || (Number(o.total_revenue || o.amount || 0) - Number(o.total_cost || 0))), 0);

  // Deliveries breakdown
  const deliveries = await prisma.delivery.findMany({
    where: { created_at: { gte: startDate, lte: endDate } },
    select: { status: true },
  });

  const deliveryStats = {
    total: deliveries.length,
    pending: deliveries.filter((d) => ['CREATED', 'PENDING'].includes(d.status)).length,
    onTheWay: deliveries.filter((d) => d.status === 'ON_THE_WAY').length,
    arrived: deliveries.filter((d) => d.status === 'ARRIVED').length,
    delivered: deliveries.filter((d) => d.status === 'DELIVERED').length,
    failed: deliveries.filter((d) => d.status === 'FAILED').length,
    cancelled: deliveries.filter((d) => d.status === 'CANCELLED').length,
  };

  // Drivers breakdown
  const drivers = await prisma.driver.findMany({
    select: { status: true },
  });
  const driverStats = {
    total: drivers.length,
    active: drivers.filter((d) => d.status === 'AVAILABLE' || d.status === 'ON_DELIVERY').length,
    inactive: drivers.filter((d) => d.status === 'INACTIVE').length,
    delivering: drivers.filter((d) => d.status === 'ON_DELIVERY').length,
    available: drivers.filter((d) => d.status === 'AVAILABLE').length,
  };

  // Notifications breakdown
  const notifications = await prisma.orderNotification.findMany({
    where: { created_at: { gte: startDate, lte: endDate } },
    select: { status: true },
  });
  const notificationStats = {
    total: notifications.length,
    sent: notifications.filter((n) => n.status === 'SENT').length,
    delivered: notifications.filter((n) => n.status === 'DELIVERED').length,
    failed: notifications.filter((n) => n.status === 'FAILED').length,
    queued: notifications.filter((n) => n.status === 'QUEUED').length,
  };

  // Active Merchants set
  const activeMerchantIds = new Set(orders.map((o) => o.merchant_id));
  const activeMerchantsCount = activeMerchantIds.size;

  return {
    period,
    merchants: {
      total: totalMerchants,
      active: activeMerchants,
      suspended: suspendedMerchants,
      archived: archivedMerchants,
      newToday: newMerchantsToday,
      newWeek: newMerchantsWeek,
      newMonth: newMerchantsMonth,
      engagedPeriod: activeMerchantsCount,
    },
    orders: {
      total: totalOrders,
      totalSalesValue,
      totalProductCost,
      totalGrossProfit,
    },
    deliveries: deliveryStats,
    drivers: driverStats,
    notifications: notificationStats,
  };
}

export async function getPlatformGrowthData(interval: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'MONTHLY') {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();

  // Aggregate monthly data for current year
  const growthSeries = await Promise.all(
    months.map(async (monthName, idx) => {
      const monthStart = new Date(currentYear, idx, 1);
      const monthEnd = new Date(currentYear, idx + 1, 0, 23, 59, 59);

      const [merchants, orders, deliveries, visitors, notifications] = await Promise.all([
        prisma.merchant.count({ where: { created_at: { lte: monthEnd } } }),
        prisma.order.count({ where: { created_at: { gte: monthStart, lte: monthEnd } } }),
        prisma.delivery.count({ where: { created_at: { gte: monthStart, lte: monthEnd } } }),
        prisma.analyticsEvent.count({ where: { created_at: { gte: monthStart, lte: monthEnd } } }),
        prisma.orderNotification.count({ where: { created_at: { gte: monthStart, lte: monthEnd } } }),
      ]);

      const salesAgg = await prisma.order.aggregate({
        _sum: { total_revenue: true, amount: true },
        where: { created_at: { gte: monthStart, lte: monthEnd } },
      });

      const salesValue = Number(salesAgg._sum.total_revenue || salesAgg._sum.amount || 0);

      return {
        label: monthName,
        merchants: merchants,
        orders: orders,
        sales: salesValue,
        deliveries: deliveries,
        visitors: visitors,
        notifications: notifications,
      };
    })
  );

  return growthSeries;
}

export async function getAllMerchantsDetailed(search?: string, status?: string) {
  const where: any = {};
  if (status && status !== 'ALL') {
    where.status = status;
  }
  if (search) {
    const query = search.trim();
    where.OR = [
      { business_name: { contains: query, mode: 'insensitive' } },
      { business_phone: { contains: query } },
      { email: { contains: query, mode: 'insensitive' } },
      { id: { contains: query } },
    ];
  }

  const merchants = await prisma.merchant.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: {
      users: { select: { id: true, name: true, phone: true, email: true, role: true } },
      _count: {
        select: {
          orders: true,
          deliveries: true,
          drivers: true,
          customers: true,
        },
      },
    },
  });

  const enriched = await Promise.all(
    merchants.map(async (m) => {
      const salesAgg = await prisma.order.aggregate({
        _sum: { total_revenue: true, amount: true },
        where: { merchant_id: m.id },
      });

      return {
        ...m,
        ordersCount: m._count.orders,
        deliveriesCount: m._count.deliveries,
        driversCount: m._count.drivers,
        customersCount: m._count.customers,
        totalSales: Number(salesAgg._sum.total_revenue || salesAgg._sum.amount || 0),
      };
    })
  );

  return enriched;
}

export async function createMerchantFromAdmin(input: {
  fullName: string;
  phone: string;
  email?: string;
  businessName: string;
  brandName?: string;
  businessPhone: string;
  businessEmail?: string;
  businessAddress?: string;
  businessLocation?: string;
  username: string;
  temporaryPassword: string;
  pinCode?: string;
  logoUrl?: string;
  brandColor?: string;
  status?: string;
  adminUserId: string;
}) {
  // Check unique user phone/email
  const existingUser = await prisma.merchantUser.findFirst({
    where: {
      OR: [{ phone: input.phone }, { email: input.email || undefined }],
    },
  });

  if (existingUser) {
    throw new Error('A merchant user with this phone or email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.temporaryPassword, 10);
  const pinHash = input.pinCode ? await bcrypt.hash(input.pinCode, 10) : undefined;

  const merchant = await prisma.merchant.create({
    data: {
      business_name: input.businessName,
      business_phone: input.businessPhone,
      email: input.businessEmail || input.email,
      location: input.businessLocation || input.businessAddress,
      logo_url: input.logoUrl,
      brand_color: input.brandColor || '#1E40AF',
      status: input.status || 'ACTIVE',
      users: {
        create: {
          name: input.fullName,
          phone: input.phone,
          email: input.email,
          role: 'MERCHANT',
          password_hash: passwordHash,
          pin_hash: pinHash,
          status: 'ACTIVE',
        },
      },
    },
    include: {
      users: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      admin_id: input.adminUserId,
      merchant_id: merchant.id,
      action: 'MERCHANT_CREATED_BY_ADMIN',
      object_type: 'MERCHANT',
      object_id: merchant.id,
      metadata: JSON.stringify({ businessName: merchant.business_name, ownerName: input.fullName }),
    },
  });

  return merchant;
}

export async function updateMerchantStatus(merchantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED', adminUserId: string, reason?: string) {
  const merchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      admin_id: adminUserId,
      merchant_id: merchantId,
      action: `MERCHANT_${status}`,
      object_type: 'MERCHANT',
      object_id: merchantId,
      metadata: reason ? JSON.stringify({ reason }) : undefined,
    },
  });

  return merchant;
}

export async function getMerchant360Profile(merchantId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      users: true,
      drivers: true,
      customers: true,
      products: true,
      achievements: true,
      scores: { orderBy: { calculated_at: 'desc' }, take: 1 },
    },
  });

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  // Fetch metrics
  const [orders, deliveries, notifications, auditLogs] = await Promise.all([
    prisma.order.findMany({
      where: { merchant_id: merchantId },
      orderBy: { created_at: 'desc' },
      take: 200,
      include: {
        driver: { select: { name: true, phone: true } },
        customer: { select: { name: true, phone: true } },
      },
    }),
    prisma.delivery.findMany({
      where: { merchant_id: merchantId },
      orderBy: { created_at: 'desc' },
      take: 200,
    }),
    prisma.orderNotification.findMany({
      where: { order: { merchant_id: merchantId } },
      orderBy: { created_at: 'desc' },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: { merchant_id: merchantId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    }),
  ]);

  const streak = await getMerchantStreak(merchantId);
  const scoreData = await calculateMerchantScore(merchantId);
  await checkAndAwardAchievements(merchantId);

  // Financial aggregates
  const totalSales = orders.reduce((sum, o) => sum + Number(o.total_revenue || o.amount || 0), 0);
  const totalCost = orders.reduce((sum, o) => sum + Number(o.total_cost || 0), 0);
  const grossProfit = orders.reduce((sum, o) => sum + Number(o.gross_profit || (Number(o.total_revenue || o.amount || 0) - Number(o.total_cost || 0))), 0);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const failedOrders = orders.filter((o) => ['FAILED', 'CANCELLED'].includes(o.status)).length;

  return {
    merchant,
    score: scoreData,
    streak,
    summary: {
      totalOrders: orders.length,
      pendingOrders,
      deliveredOrders,
      failedOrders,
      totalSales,
      totalCost,
      grossProfit,
      driversCount: merchant.drivers.length,
      customersCount: merchant.customers.length,
      productsCount: merchant.products.length,
    },
    orders,
    deliveries,
    notifications,
    auditLogs,
  };
}

export async function getAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
    include: {
      merchant: { select: { business_name: true } },
      user: { select: { name: true, phone: true } },
    },
  });
}

export async function globalAdminSearch(query: string) {
  if (!query || query.trim().length === 0) return { merchants: [], orders: [], customers: [], drivers: [] };

  const q = query.trim();

  const [merchants, orders, customers, drivers] = await Promise.all([
    prisma.merchant.findMany({
      where: {
        OR: [
          { business_name: { contains: q, mode: 'insensitive' } },
          { business_phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
          { id: { contains: q } },
        ],
      },
      take: 10,
    }),
    prisma.order.findMany({
      where: {
        OR: [
          { order_number: { contains: q, mode: 'insensitive' } },
          { customer_name: { contains: q, mode: 'insensitive' } },
          { customer_phone: { contains: q } },
          { product_name: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { merchant: { select: { business_name: true } } },
      take: 10,
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { merchant: { select: { business_name: true } } },
      take: 10,
    }),
    prisma.driver.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      include: { merchant: { select: { business_name: true } } },
      take: 10,
    }),
  ]);

  return { merchants, orders, customers, drivers };
}

export async function updateMerchantFromAdmin(
  merchantId: string,
  input: {
    businessName?: string;
    businessPhone?: string;
    businessEmail?: string;
    location?: string;
    logoUrl?: string;
    brandColor?: string;
    status?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    password?: string;
    pinCode?: string;
    adminUserId: string;
  }
) {
  const existingMerchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { users: true },
  });

  if (!existingMerchant) {
    throw new Error('Merchant not found');
  }

  // Update Merchant profile
  const updatedMerchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: {
      business_name: input.businessName ?? existingMerchant.business_name,
      business_phone: input.businessPhone ?? existingMerchant.business_phone,
      email: input.businessEmail !== undefined ? input.businessEmail : existingMerchant.email,
      location: input.location !== undefined ? input.location : existingMerchant.location,
      logo_url: input.logoUrl !== undefined ? input.logoUrl : existingMerchant.logo_url,
      brand_color: input.brandColor ?? existingMerchant.brand_color,
      status: input.status ?? existingMerchant.status,
    },
  });

  // Update primary merchant user if user details provided
  const primaryUser = existingMerchant.users[0];
  if (primaryUser) {
    const userUpdateData: any = {};
    if (input.fullName) userUpdateData.name = input.fullName;
    if (input.phone) userUpdateData.phone = input.phone;
    if (input.email !== undefined) userUpdateData.email = input.email;
    if (input.password && input.password.trim()) {
      userUpdateData.password_hash = await bcrypt.hash(input.password, 10);
    }
    if (input.pinCode && input.pinCode.trim()) {
      userUpdateData.pin_hash = await bcrypt.hash(input.pinCode, 10);
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.merchantUser.update({
        where: { id: primaryUser.id },
        data: userUpdateData,
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      admin_id: input.adminUserId,
      merchant_id: merchantId,
      action: 'MERCHANT_UPDATED_BY_ADMIN',
      object_type: 'MERCHANT',
      object_id: merchantId,
      metadata: JSON.stringify({ businessName: updatedMerchant.business_name }),
    },
  });

  return updatedMerchant;
}

export async function deleteMerchantFromAdmin(merchantId: string, adminUserId: string) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { users: true },
  });

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  // Prevent deleting the System/Admin merchant account
  const hasAdminUser = merchant.users.some((u) => u.role === 'ADMIN');
  if (hasAdminUser) {
    throw new Error('Action Blocked: Super Administrator platform account cannot be deleted!');
  }

  // Delete related child records in order
  await prisma.orderNotification.deleteMany({ where: { order: { merchant_id: merchantId } } });
  await prisma.delivery.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.order.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.driver.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.customer.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.product.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.merchantAchievement.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.merchantScore.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.analyticsEvent.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.auditLog.deleteMany({ where: { merchant_id: merchantId } });
  await prisma.merchantUser.deleteMany({ where: { merchant_id: merchantId } });

  // Delete merchant record
  await prisma.merchant.delete({
    where: { id: merchantId },
  });

  return { message: `Merchant "${merchant.business_name}" permanently deleted successfully.` };
}


