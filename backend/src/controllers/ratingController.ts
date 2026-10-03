import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Public: Get order info for customer rating page by rating_token
 */
export async function getPublicRatingInfo(req: Request, res: Response) {
  try {
    const { token } = req.params;

    if (!token) {
      return sendError(res, 'BAD_REQUEST', 'Rating token is required', 400);
    }

    // Find order by rating_token
    const order: any = await (prisma.order as any).findUnique({
      where: { rating_token: token },
      include: {
        merchant: {
          select: {
            business_name: true,
            logo_url: true,
            brand_color: true,
          },
        },
        driver: {
          select: {
            name: true,
            vehicle_info: true,
          },
        },
        rating: true,
      },
    });

    if (!order) {
      return sendError(res, 'NOT_FOUND', 'Invalid rating link or order not found.', 404);
    }

    return sendSuccess(res, {
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      merchant_name: order.merchant?.business_name || 'LUMO',
      merchant_logo: order.merchant?.logo_url || null,
      driver_name: order.driver_name || order.driver?.name || null,
      product_name: order.product_name,
      status: order.status,
      delivered_at: order.delivered_at,
      is_already_rated: !!order.rating,
      existing_rating: order.rating
        ? {
            rating: order.rating.rating,
            comment: order.rating.comment,
            created_at: order.rating.created_at,
          }
        : null,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Public: Submit customer rating for order
 */
export async function submitPublicRating(req: Request, res: Response) {
  try {
    const { rating_token, rating, comment } = req.body;

    if (!rating_token) {
      return sendError(res, 'BAD_REQUEST', 'Rating token is required', 400);
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return sendError(res, 'INVALID_RATING', 'Rating must be an integer between 1 and 5 stars.', 400);
    }

    const order: any = await (prisma.order as any).findUnique({
      where: { rating_token },
      include: { rating: true },
    });

    if (!order) {
      return sendError(res, 'NOT_FOUND', 'Invalid rating link or order not found.', 404);
    }

    if (order.rating) {
      return sendError(
        res,
        'ALREADY_RATED',
        'You have already submitted a rating for this delivery experience.',
        400,
      );
    }

    const newRating = await (prisma as any).customerRating.create({
      data: {
        order_id: order.id,
        merchant_id: order.merchant_id,
        driver_id: order.driver_id || null,
        rating_token,
        rating: ratingVal,
        comment: comment && typeof comment === 'string' ? comment.trim() : null,
      },
    });

    return sendSuccess(res, {
      message: 'Thank you! Your rating has been submitted successfully.',
      rating: newRating,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Merchant: Get customer rating analytics and feedback list
 */
export async function getMerchantRatings(req: Request, res: Response) {
  try {
    const merchantId = req.user?.merchant_id;
    if (!merchantId) {
      return sendError(res, 'UNAUTHORIZED', 'Merchant ID required', 401);
    }

    const { period } = req.query; // 'today' | 'week' | 'month' | 'all'
    const where: any = { merchant_id: merchantId };

    const now = new Date();
    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.created_at = { gte: todayStart };
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.created_at = { gte: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.created_at = { gte: monthAgo };
    }

    const ratings: any[] = await (prisma as any).customerRating.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        order: {
          select: {
            order_number: true,
            customer_name: true,
            customer_phone: true,
            product_name: true,
            driver_name: true,
            delivered_at: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    const totalRatings = ratings.length;
    let sumRating = 0;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const driverStatsMap: Record<string, { id: string; name: string; phone?: string; total: number; sum: number }> = {};

    ratings.forEach((r: any) => {
      sumRating += r.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        breakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
      }

      if (r.driver_id) {
        const dId = r.driver_id;
        const dName = r.driver?.name || r.order?.driver_name || 'Driver';
        if (!driverStatsMap[dId]) {
          driverStatsMap[dId] = {
            id: dId,
            name: dName,
            phone: r.driver?.phone,
            total: 0,
            sum: 0,
          };
        }
        driverStatsMap[dId].total++;
        driverStatsMap[dId].sum += r.rating;
      }
    });

    const averageRating = totalRatings > 0 ? parseFloat((sumRating / totalRatings).toFixed(1)) : 0;

    const driverRatings = Object.values(driverStatsMap).map((d) => ({
      driver_id: d.id,
      driver_name: d.name,
      driver_phone: d.phone,
      total_ratings: d.total,
      average_rating: parseFloat((d.sum / d.total).toFixed(1)),
    }));

    // Sort drivers by highest average rating
    driverRatings.sort((a, b) => b.average_rating - a.average_rating);

    return sendSuccess(res, {
      average_rating: averageRating,
      total_ratings: totalRatings,
      breakdown,
      driver_ratings: driverRatings,
      feedback: ratings.map((r: any) => ({
        id: r.id,
        order_number: r.order?.order_number,
        customer_name: r.order?.customer_name,
        customer_phone: r.order?.customer_phone,
        driver_name: r.driver?.name || r.order?.driver_name,
        product_name: r.order?.product_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      })),
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

/**
 * Admin: Get platform-wide customer ratings and detailed analytics
 */
export async function getAdminRatings(req: Request, res: Response) {
  try {
    const { period, merchant_id, driver_id, min_rating, max_rating } = req.query;
    const where: any = {};

    const now = new Date();
    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.created_at = { gte: todayStart };
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.created_at = { gte: weekAgo };
    } else if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.created_at = { gte: monthAgo };
    }

    if (merchant_id && typeof merchant_id === 'string' && merchant_id !== 'ALL') {
      where.merchant_id = merchant_id;
    }

    if (driver_id && typeof driver_id === 'string' && driver_id !== 'ALL') {
      where.driver_id = driver_id;
    }

    if (min_rating || max_rating) {
      where.rating = {};
      if (min_rating) where.rating.gte = parseInt(min_rating as string, 10);
      if (max_rating) where.rating.lte = parseInt(max_rating as string, 10);
    }

    const ratings: any[] = await (prisma as any).customerRating.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        merchant: {
          select: {
            id: true,
            business_name: true,
          },
        },
        order: {
          select: {
            order_number: true,
            customer_name: true,
            customer_phone: true,
            product_name: true,
            driver_name: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    const totalRatings = ratings.length;
    let sumRating = 0;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const merchantMap: Record<string, { id: string; name: string; total: number; sum: number }> = {};
    const driverMap: Record<string, { id: string; name: string; merchant_name: string; total: number; sum: number }> = {};

    ratings.forEach((r: any) => {
      sumRating += r.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        breakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
      }

      // Merchant aggregate
      const mId = r.merchant_id;
      const mName = r.merchant?.business_name || 'Merchant';
      if (!merchantMap[mId]) {
        merchantMap[mId] = { id: mId, name: mName, total: 0, sum: 0 };
      }
      merchantMap[mId].total++;
      merchantMap[mId].sum += r.rating;

      // Driver aggregate
      if (r.driver_id) {
        const dId = r.driver_id;
        const dName = r.driver?.name || r.order?.driver_name || 'Driver';
        if (!driverMap[dId]) {
          driverMap[dId] = { id: dId, name: dName, merchant_name: mName, total: 0, sum: 0 };
        }
        driverMap[dId].total++;
        driverMap[dId].sum += r.rating;
      }
    });

    const overallRating = totalRatings > 0 ? parseFloat((sumRating / totalRatings).toFixed(1)) : 0;

    const merchantPerformance = Object.values(merchantMap).map((m) => ({
      merchant_id: m.id,
      business_name: m.name,
      total_ratings: m.total,
      average_rating: parseFloat((m.sum / m.total).toFixed(1)),
    })).sort((a, b) => b.average_rating - a.average_rating);

    const driverPerformance = Object.values(driverMap).map((d) => ({
      driver_id: d.id,
      driver_name: d.name,
      merchant_name: d.merchant_name,
      total_ratings: d.total,
      average_rating: parseFloat((d.sum / d.total).toFixed(1)),
    })).sort((a, b) => b.average_rating - a.average_rating);

    const lowRatingsCount = breakdown[1] + breakdown[2];

    return sendSuccess(res, {
      overall_rating: overallRating,
      total_ratings: totalRatings,
      low_ratings_count: lowRatingsCount,
      breakdown,
      merchant_performance: merchantPerformance,
      driver_performance: driverPerformance,
      ratings_log: ratings.map((r: any) => ({
        id: r.id,
        order_number: r.order?.order_number,
        merchant_name: r.merchant?.business_name,
        customer_name: r.order?.customer_name,
        customer_phone: r.order?.customer_phone,
        driver_name: r.driver?.name || r.order?.driver_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      })),
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}
