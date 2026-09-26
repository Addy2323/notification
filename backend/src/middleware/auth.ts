import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sendError } from '../utils/response';
import { prisma } from '../database/prisma';

export interface AuthUser {
  id: string;
  merchant_id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: 'MERCHANT' | 'STAFF' | 'ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check authorization header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication token missing', 401);
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    
    const user = await prisma.merchantUser.findUnique({
      where: { id: decoded.userId },
      include: { merchant: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return sendError(res, 'UNAUTHORIZED', 'Invalid or inactive user account', 401);
    }

    if (user.merchant.status !== 'ACTIVE' && user.role !== 'ADMIN') {
      return sendError(res, 'FORBIDDEN', 'Merchant account is suspended', 403);
    }

    req.user = {
      id: user.id,
      merchant_id: user.merchant_id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role as any,
    };

    next();
  } catch (err) {
    return sendError(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}

export function requireRole(allowedRoles: ('MERCHANT' | 'STAFF' | 'ADMIN')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'FORBIDDEN', 'Insufficient permissions for this action', 403);
    }

    next();
  };
}
