import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendSuccess, sendError } from '../utils/response';
import * as marketplaceService from '../services/marketplaceService';

function getOptionalAuthUser(req: Request): { userId: string; merchantId?: string } | null {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return null;
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (decoded?.userId) return { userId: decoded.userId, merchantId: decoded.merchantId };
  } catch {
    // Ignore invalid/expired optional token
  }
  return null;
}

export async function listPublicCategories(req: Request, res: Response) {
  try {
    const categories = await marketplaceService.listPublicCategories();
    return sendSuccess(res, { categories });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function listPublicMerchants(req: Request, res: Response) {
  try {
    const data = await marketplaceService.listPublicMerchants({
      q: req.query.q as string | undefined,
      category: req.query.category as string | undefined,
      subcategory: req.query.subcategory as string | undefined,
      verifiedOnly: req.query.verified === 'true',
      location: req.query.location as string | undefined,
      sort: (req.query.sort as any) || 'popularity',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 18,
    });
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function getPublicMerchantProfile(req: Request, res: Response) {
  try {
    const authUser = getOptionalAuthUser(req);
    const followerKey = authUser?.userId ? `user:${authUser.userId}` : null;
    const profile = await marketplaceService.getPublicMerchantProfile(req.params.slug, followerKey);
    if (!profile) {
      return sendError(res, 'NOT_FOUND', 'Merchant profile not found or unpublished', 404);
    }
    return sendSuccess(res, profile);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function toggleFollowMerchant(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return sendError(res, 'UNAUTHORIZED', 'Please sign in to follow merchants', 401);
    }
    const followerKey = `user:${user.id}`;
    const result = await marketplaceService.toggleFollowMerchant(
      req.params.slug,
      followerKey,
      user.id,
      user.name || null
    );
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'FOLLOW_ERROR', err.message || 'Unable to update follow status', 400);
  }
}

// Merchant Endpoints
export async function getMyCategories(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const data = await marketplaceService.getMerchantCategoriesSelection(merchantId);
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function updateMyCategories(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.merchant_id) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const { primaryCategoryId, additionalCategoryIds } = req.body || {};
    if (!primaryCategoryId) {
      return sendError(res, 'VALIDATION_ERROR', 'Primary category is required', 400);
    }
    const data = await marketplaceService.updateMerchantCategoriesSelection(
      user.merchant_id,
      user.id,
      primaryCategoryId,
      Array.isArray(additionalCategoryIds) ? additionalCategoryIds : []
    );
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function listMyPosts(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const posts = await marketplaceService.listMyMerchantPosts(merchantId);
    return sendSuccess(res, { posts });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function createMyPost(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.merchant_id) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const post = await marketplaceService.createMyMerchantPost(user.merchant_id, user.id, req.body || {});
    return sendSuccess(res, { post }, 201);
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function deleteMyPost(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.merchant_id) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const result = await marketplaceService.deleteMyMerchantPost(user.merchant_id, user.id, req.params.id);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message, 404);
  }
}

// Admin Endpoints
export async function listAdminCategories(req: Request, res: Response) {
  try {
    const categories = await marketplaceService.listAdminCategories();
    return sendSuccess(res, { categories });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function createAdminCategory(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const { name } = req.body || {};
    if (!name?.trim()) return sendError(res, 'VALIDATION_ERROR', 'Category name is required', 400);
    const category = await marketplaceService.createAdminCategory(adminId, req.body);
    return sendSuccess(res, { category }, 201);
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function updateAdminCategory(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const category = await marketplaceService.updateAdminCategory(adminId, req.params.id, req.body || {});
    return sendSuccess(res, { category });
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function deleteAdminCategory(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.id;
    const result = await marketplaceService.deleteAdminCategory(adminId, req.params.id);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message, 404);
  }
}

