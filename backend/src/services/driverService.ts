import { prisma } from '../database/prisma';

export async function searchDrivers(merchantId: string, query?: string) {
  const where: any = { merchant_id: merchantId };

  if (query && query.trim()) {
    const s = query.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s } },
    ];
  }

  return prisma.driver.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 50,
    include: {
      _count: { select: { orders: { where: { status: { in: ['OUT_FOR_DELIVERY', 'DRIVER_ASSIGNED'] } } } } },
    },
  });
}

export async function getDriverById(merchantId: string, driverId: string) {
  return prisma.driver.findFirst({
    where: { id: driverId, merchant_id: merchantId },
    include: {
      orders: {
        where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
        orderBy: { created_at: 'desc' },
        take: 5,
      },
    },
  });
}

export async function createDriver(merchantId: string, data: { name: string; phone: string }) {
  // Check for existing driver with same phone for this merchant
  const existing = await prisma.driver.findUnique({
    where: { merchant_id_phone: { merchant_id: merchantId, phone: data.phone } },
  });

  if (existing) {
    return prisma.driver.update({
      where: { id: existing.id },
      data: { name: data.name, status: 'AVAILABLE' },
    });
  }

  return prisma.driver.create({
    data: {
      merchant_id: merchantId,
      name: data.name,
      phone: data.phone,
      status: 'AVAILABLE',
    },
  });
}

export async function updateDriverStatus(merchantId: string, driverId: string, status: string) {
  return prisma.driver.update({
    where: { id: driverId },
    data: { status },
  });
}

export async function listDrivers(merchantId: string) {
  return prisma.driver.findMany({
    where: { merchant_id: merchantId },
    orderBy: { created_at: 'desc' },
    include: {
      orders: {
        where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
        select: { id: true, order_number: true, status: true, customer_name: true },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          orders: { where: { status: 'DELIVERED' } },
        },
      },
    },
  });
}
