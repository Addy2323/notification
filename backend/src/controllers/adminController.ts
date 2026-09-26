import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import * as adminService from '../services/adminService';

export async function getMetrics(req: Request, res: Response) {
  try {
    const metrics = await adminService.getAdminMetrics();
    return sendSuccess(res, metrics);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function listMerchants(req: Request, res: Response) {
  try {
    const merchants = await adminService.getAllMerchants();
    return sendSuccess(res, merchants);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function toggleMerchantStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE or SUSPENDED

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return sendError(res, 'VALIDATION_ERROR', 'Status must be ACTIVE or SUSPENDED', 400);
    }

    const updated = await adminService.updateMerchantStatus(id, status, req.user!.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, 'ACTION_FAILED', err.message, 400);
  }
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const logs = await adminService.getAuditLogs();
    return sendSuccess(res, logs);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}
