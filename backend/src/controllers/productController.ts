import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { sendSuccess, sendError } from '../utils/response';

export class ProductController {
  static async list(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const query = req.query.q as string;
      const products = query
        ? await ProductService.searchProducts(merchantId, query)
        : await ProductService.listProducts(merchantId);

      return sendSuccess(res, products);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const product = await ProductService.getProductById(merchantId, req.params.id);
      if (!product) return sendError(res, 'NOT_FOUND', 'Product not found', 404);
      return sendSuccess(res, product);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const { name, description, sku, category, unit_price, cost_price } = req.body;

      if (!name || unit_price === undefined) {
        return sendError(res, 'BAD_REQUEST', 'Name and unit_price are required', 400);
      }

      const product = await ProductService.createProduct(merchantId, {
        name,
        description,
        sku,
        category,
        unit_price: Number(unit_price),
        cost_price: cost_price !== undefined && cost_price !== null ? Number(cost_price) : undefined,
      });

      return sendSuccess(res, product, 201);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }

  static async getTopProducts(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const sortBy = (req.query.sortBy as 'quantity' | 'revenue' | 'profit') || 'revenue';
      const limit = Number(req.query.limit) || 5;

      const topProducts = await ProductService.getTopProducts(merchantId, { sortBy, limit });
      return sendSuccess(res, topProducts);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const { name, description, sku, category, unit_price, cost_price, status } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (sku !== undefined) updateData.sku = sku;
      if (category !== undefined) updateData.category = category;
      if (unit_price !== undefined) updateData.unit_price = Number(unit_price);
      if (cost_price !== undefined) updateData.cost_price = cost_price !== null ? Number(cost_price) : null;
      if (status !== undefined) updateData.status = status;

      const updated = await ProductService.updateProduct(merchantId, req.params.id, updateData);
      if (updated.count === 0) return sendError(res, 'NOT_FOUND', 'Product not found', 404);
      const product = await ProductService.getProductById(merchantId, req.params.id);
      return sendSuccess(res, product);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const merchantId = req.user!.merchant_id;
      const result = await ProductService.deleteProduct(merchantId, req.params.id);
      if (!result) return sendError(res, 'NOT_FOUND', 'Product not found', 404);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, 'INTERNAL_ERROR', err.message, 500);
    }
  }
}
