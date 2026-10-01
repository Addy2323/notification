import { prisma } from '../database/prisma';

export async function searchCustomers(merchantId: string, query?: string) {
  const where: any = { merchant_id: merchantId };

  if (query && query.trim()) {
    const s = query.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s } },
      { delivery_address: { contains: s, mode: 'insensitive' } },
    ];
  }

  return prisma.customer.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 50,
  });
}

export async function getCustomerById(merchantId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, merchant_id: merchantId },
  });
}

export async function createCustomer(merchantId: string, data: { name: string; phone: string; delivery_address?: string }) {
  // Check for existing customer with same phone for this merchant
  const existing = await prisma.customer.findUnique({
    where: { merchant_id_phone: { merchant_id: merchantId, phone: data.phone } },
  });

  if (existing) {
    // Update and return existing
    return prisma.customer.update({
      where: { id: existing.id },
      data: { name: data.name, delivery_address: data.delivery_address || existing.delivery_address },
    });
  }

  return prisma.customer.create({
    data: {
      merchant_id: merchantId,
      name: data.name,
      phone: data.phone,
      delivery_address: data.delivery_address || null,
    },
  });
}
