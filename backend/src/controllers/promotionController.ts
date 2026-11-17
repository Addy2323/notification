import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import * as promotionService from '../services/promotionService';

export async function getOverview(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const data = await promotionService.getMerchantPromotionsOverview(merchantId);
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function listTemplates(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const templates = await promotionService.listMerchantTemplates(merchantId);
    return sendSuccess(res, { templates });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function createTemplate(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const template = await promotionService.saveMerchantTemplate(merchantId, req.body || {});
    return sendSuccess(res, { template }, 201);
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function deleteTemplate(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const result = await promotionService.deleteMerchantTemplate(merchantId, req.params.id);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message, 404);
  }
}

export async function listTargetCustomers(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const data = await promotionService.listMerchantTargetCustomers(merchantId, {
      q: req.query.q as string | undefined,
      filter: (req.query.filter as any) || 'ALL',
    });
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function previewCampaign(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const preview = await promotionService.previewSmsCampaign(merchantId, req.body || {});
    return sendSuccess(res, preview);
  } catch (err: any) {
    return sendError(res, 'VALIDATION_ERROR', err.message, 400);
  }
}

export async function createCampaign(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.merchant_id) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const campaign = await promotionService.createAndSendSmsCampaign(
      user.merchant_id,
      user.id,
      req.body || {}
    );
    return sendSuccess(res, { campaign }, 201);
  } catch (err: any) {
    return sendError(res, 'CAMPAIGN_ERROR', err.message, 400);
  }
}

export async function getCampaignDetails(req: Request, res: Response) {
  try {
    const merchantId = (req as any).user?.merchant_id;
    if (!merchantId) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const campaign = await promotionService.getMerchantCampaignDetails(merchantId, req.params.id);
    return sendSuccess(res, { campaign });
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message, 404);
  }
}

export async function duplicateCampaign(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.merchant_id) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const campaign = await promotionService.duplicateMerchantCampaign(
      user.merchant_id,
      user.id,
      req.params.id
    );
    return sendSuccess(res, { campaign }, 201);
  } catch (err: any) {
    return sendError(res, 'DUPLICATE_ERROR', err.message, 400);
  }
}

export async function retryCampaign(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.merchant_id) return sendError(res, 'FORBIDDEN', 'Merchant workspace required', 403);
    const result = await promotionService.retryFailedCampaignMessages(
      user.merchant_id,
      user.id,
      req.params.id
    );
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'RETRY_ERROR', err.message, 400);
  }
}

// Admin Overview
export async function getAdminOverview(req: Request, res: Response) {
  try {
    const data = await promotionService.getAdminPromotionsOverview();
    return sendSuccess(res, data);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

