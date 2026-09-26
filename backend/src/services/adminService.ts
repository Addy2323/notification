import { prisma } from '../database/prisma';

export async function getAdminMetrics() {
  const [totalMerchants, activeMerchants, totalDeliveries, deliveredCount, failedCount, totalNotifications] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.delivery.count(),
    prisma.delivery.count({ where: { status: 'DELIVERED' } }),
    prisma.delivery.count({ where: { status: { in: ['CANCELLED', 'FAILED'] } } }),
    prisma.notification.count(),
  ]);

  return {
    totalMerchants,
    activeMerchants,
    totalDeliveries,
    deliveredCount,
    failedCount,
    totalNotifications,
  };
}

export async function getAllMerchants() {
  return prisma.merchant.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      users: { select: { id: true, name: true, phone: true, email: true, role: true } },
      _count: { select: { deliveries: true } },
    },
  });
}

export async function updateMerchantStatus(merchantId: string, status: 'ACTIVE' | 'SUSPENDED', adminUserId: string) {
  const merchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      admin_id: adminUserId,
      merchant_id: merchantId,
      action: status === 'ACTIVE' ? 'MERCHANT_REACTIVATED' : 'MERCHANT_SUSPENDED',
      object_type: 'MERCHANT',
      object_id: merchantId,
    },
  });

  return merchant;
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
