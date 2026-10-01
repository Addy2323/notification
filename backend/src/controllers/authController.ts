import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { registerSchema, requestOtpSchema, verifyOtpSchema, verifyPinSchema, resetPinSchema, checkPhoneSchema, resetPasswordSchema, verifyPasswordSchema } from '../validators';
import * as authService from '../services/authService';
import { prisma } from '../database/prisma';

export async function register(req: Request, res: Response) {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.registerMerchant(parse.data);
    res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 });
    return sendSuccess(res, result, 201);
  } catch (err: any) {
    return sendError(res, 'REGISTRATION_FAILED', err.message || 'Registration failed', 400);
  }
}

export async function requestOtp(req: Request, res: Response) {
  try {
    const parse = requestOtpSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.requestOtp(parse.data.phone);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'OTP_REQUEST_FAILED', err.message || 'OTP Request failed', 400);
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const parse = verifyOtpSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.verifyOtp(parse.data.phone, parse.data.otp);
    res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 });
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'AUTH_FAILED', err.message || 'Invalid OTP or phone number', 401);
  }
}

export async function verifyPin(req: Request, res: Response) {
  try {
    const parse = verifyPinSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.verifyPin(parse.data.phone, parse.data.pin);
    res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 });
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'AUTH_FAILED', err.message || 'Invalid PIN passcode', 401);
  }
}

export async function resetPin(req: Request, res: Response) {
  try {
    const parse = resetPinSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.resetPin(parse.data.phone, parse.data.otp, parse.data.new_pin);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'RESET_FAILED', err.message || 'Failed to reset PIN passcode', 400);
  }
}

export async function checkPhone(req: Request, res: Response) {
  try {
    const parse = checkPhoneSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.checkPhoneExists(parse.data.phone);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'NOT_FOUND', err.message || 'Phone number not registered', 404);
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const parse = resetPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.resetPassword(parse.data);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'RESET_FAILED', err.message || 'Failed to reset password', 400);
  }
}

export async function verifyPassword(req: Request, res: Response) {
  try {
    const parse = verifyPasswordSchema.safeParse(req.body);
    if (!parse.success) {
      const issue = parse.error.issues[0];
      return sendError(res, 'VALIDATION_ERROR', issue.message, 400);
    }

    const result = await authService.verifyPassword(parse.data.identifier, parse.data.password);
    res.cookie('token', result.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 });
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'AUTH_FAILED', err.message || 'Invalid credentials', 401);
  }
}

export async function getOperators(req: Request, res: Response) {
  try {
    const result = await authService.getOperators();
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message || 'Failed to fetch operator profiles', 500);
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.user.merchant_id },
    });

    return sendSuccess(res, {
      user: req.user,
      merchant,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('token');
  return sendSuccess(res, { message: 'Logged out successfully' });
}

export async function uploadAvatar(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }
    if (!req.file) {
      return sendError(res, 'BAD_REQUEST', 'No file uploaded', 400);
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const updatedUser = await prisma.merchantUser.update({
      where: { id: req.user.id },
      data: { avatar_url: avatarUrl },
    });

    return sendSuccess(res, {
      avatar_url: updatedUser.avatar_url,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, 500);
  }
}

