import { prisma } from '../database/prisma';

export interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unit_price: number;
  cost_price?: number;
}

export class ProductService {
  static async listProducts(merchantId: string) {
    return prisma.product.findMany({
      where: { merchant_id: merchantId },
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { order_items: true },
        },
      },
    });
  }

  static async searchProducts(merchantId: string, query: string) {
    if (!query) return this.listProducts(merchantId);

    return prisma.product.findMany({
      where: {
        merchant_id: merchantId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }

  static async getProductById(merchantId: string, id: string) {
    return prisma.product.findFirst({
      where: { id, merchant_id: merchantId },
      include: {
        order_items: {
          take: 20,
          orderBy: { created_at: 'desc' },
          include: {
            order: true,
          },
        },
      },
    });
  }

  static async createProduct(merchantId: string, input: CreateProductInput) {
    return prisma.product.create({
      data: {
        merchant_id: merchantId,
        name: input.name,
        description: input.description,
        sku: input.sku,
        category: input.category,
        unit_price: input.unit_price,
        cost_price: input.cost_price ?? null,
      },
    });
  }

  static async updateProduct(merchantId: string, id: string, data: Partial<CreateProductInput & { status: string }>) {
    return prisma.product.updateMany({
      where: { id, merchant_id: merchantId },
      data,
    });
  }

  static async getTopProducts(merchantId: string, options?: { limit?: number; sortBy?: 'quantity' | 'revenue' | 'profit'; startDate?: Date; endDate?: Date }) {
    const limit = options?.limit || 5;
    const sortBy = options?.sortBy || 'revenue';

    const dateFilter: any = {};
    if (options?.startDate || options?.endDate) {
      dateFilter.created_at = {};
      if (options.startDate) dateFilter.created_at.gte = options.startDate;
      if (options.endDate) dateFilter.created_at.lte = options.endDate;
    }

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          merchant_id: merchantId,
          ...dateFilter,
        },
      },
    });

    const productMap: Record<string, { name: string; sku?: string; totalQty: number; totalRevenue: number; totalProfit: number; orderCount: number }> = {};

    for (const item of items) {
      const name = item.product_name_snapshot;
      if (!productMap[name]) {
        productMap[name] = {
          name,
          sku: item.product_sku_snapshot || undefined,
          totalQty: 0,
          totalRevenue: 0,
          totalProfit: 0,
          orderCount: 0,
        };
      }

      productMap[name].totalQty += item.quantity;
      productMap[name].totalRevenue += Number(item.subtotal);
      productMap[name].totalProfit += Number(item.profit_amount || 0);
      productMap[name].orderCount += 1;
    }

    const aggregated = Object.values(productMap);

    if (sortBy === 'quantity') {
      aggregated.sort((a, b) => b.totalQty - a.totalQty);
    } else if (sortBy === 'profit') {
      aggregated.sort((a, b) => b.totalProfit - a.totalProfit);
    } else {
      aggregated.sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    return aggregated.slice(0, limit);
  }
}
