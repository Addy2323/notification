import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { snippePaymentService } from './snippePaymentService';
import { MesejiSMSAdapter } from '../notifications/adapter';

const pAny = prisma as any;
const smsAdapter = new MesejiSMSAdapter();

let defaultPlansSeeded = false;

export async function ensureDefaultVerificationPlans() {
  if (defaultPlansSeeded || !pAny.verificationPlan?.count) return;
  const count = await pAny.verificationPlan.count();
  if (count > 0) {
    defaultPlansSeeded = true;
    return;
  }

  await pAny.verificationPlan.createMany({
    data: [
      {
        code: 'MONTHLY',
        name: 'Monthly Verification',
        description: '30-day Blue Verified Badge across Marketplace, Storefront & Search.',
        duration_days: 30,
        price_tzs: 15000,
        is_active: true,
        display_order: 1,
      },
      {
        code: 'SEMI_ANNUAL',
        name: '6 Months Verification',
        description: '180-day Blue Verified Badge with priority marketplace trust placement.',
        duration_days: 180,
        price_tzs: 75000,
        is_active: true,
        display_order: 2,
      },
      {
        code: 'ANNUAL',
        name: 'Annual Verification',
        description: '365-day Blue Verified Badge — best value for established merchants.',
        duration_days: 365,
        price_tzs: 135000,
        is_active: true,
        display_order: 3,
      },
    ],
  });
  defaultPlansSeeded = true;
}

export async function expireElapsedVerifications() {
  if (!pAny.merchant?.findMany) return 0;
  const now = new Date();
  const expiredMerchants = await pAny.merchant.findMany({
    where: {
      is_verified: true,
      verification_expires_at: { lte: now },
    },
    select: { id: true },
  });

  if (!expiredMerchants.length) return 0;
  const ids = expiredMerchants.map((m: any) => m.id);

  await prisma.$transaction(async (tx: any) => {
    await tx.merchant.updateMany({
      where: { id: { in: ids } },
      data: {
        is_verified: false,
        verification_status: 'EXPIRED',
      },
    });
    await tx.verificationApplication.updateMany({
      where: {
        merchant_id: { in: ids },
        status: 'VERIFIED',
        expires_at: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });
  });

  return ids.length;
}

export async function listPublicVerificationPlans() {
  await ensureDefaultVerificationPlans();
  return pAny.verificationPlan.findMany({
    where: { is_active: true },
    orderBy: [{ display_order: 'asc' }, { duration_days: 'asc' }],
  });
}

export async function getMerchantVerificationStatus(merchantId: string) {
  await ensureDefaultVerificationPlans();
  await expireElapsedVerifications();

  const [merchant, plans, applications] = await Promise.all([
    pAny.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        business_name: true,
        business_phone: true,
        is_verified: true,
        verification_status: true,
        verified_at: true,
        verification_expires_at: true,
      },
    }),
    listPublicVerificationPlans(),
    pAny.verificationApplication.findMany({
      where: { merchant_id: merchantId },
      include: { plan: true },
      orderBy: { created_at: 'desc' },
      take: 15,
    }),
  ]);

  if (!merchant) throw new Error('Merchant not found');

  const daysRemaining = merchant.verification_expires_at
    ? Math.max(0, Math.ceil((new Date(merchant.verification_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    merchant: {
      id: merchant.id,
      businessName: merchant.business_name,
      businessPhone: merchant.business_phone,
      isVerified: Boolean(merchant.is_verified && merchant.verification_status === 'VERIFIED'),
      verificationStatus: merchant.verification_status,
      verifiedAt: merchant.verified_at,
      expiresAt: merchant.verification_expires_at,
      daysRemaining,
      renewalReminder: daysRemaining !== null && daysRemaining <= 7 && merchant.is_verified,
    },
    plans,
    applications,
  };
}

export async function initiateVerificationPayment(
  merchantId: string,
  userId: string,
  planId: string,
  phone: string
) {
  await ensureDefaultVerificationPlans();

  const [merchant, plan] = await Promise.all([
    pAny.merchant.findUnique({ where: { id: merchantId } }),
    pAny.verificationPlan.findFirst({ where: { id: planId, is_active: true } }),
  ]);

  if (!merchant) throw new Error('Merchant not found');
  if (!plan) throw new Error('Selected verification plan is invalid or inactive');

  const cleanPhone = (phone || merchant.business_phone || '').replace(/[^0-9+]/g, '').trim();
  if (cleanPhone.length < 9) {
    throw new Error('Please provide a valid mobile money phone number');
  }

  const reference = `VER_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const frontendUrl = config.frontendUrl.replace(/\/$/, '');
  const backendPublicUrl = (process.env.BACKEND_PUBLIC_URL || `${frontendUrl}`).replace(/\/$/, '');

  const session = await snippePaymentService.createSession({
    amount: plan.price_tzs,
    currency: 'TZS',
    customer: {
      name: merchant.business_name,
      phone: cleanPhone,
      email: merchant.email || 'merchant@lumotrack.lumo.co.tz',
    },
    redirect_url: `${frontendUrl}/dashboard/verification?ref=${encodeURIComponent(reference)}`,
    webhook_url: `${backendPublicUrl}/api/verification/webhook/snippe`,
    description: `LUMO Track Verified Badge - ${plan.name} (${merchant.business_name})`,
    metadata: {
      reference,
      merchant_id: merchantId,
      plan_id: plan.id,
      payment_purpose: 'MERCHANT_VERIFICATION',
    },
  });

  const application = await prisma.$transaction(async (tx: any) => {
    const app = await tx.verificationApplication.create({
      data: {
        merchant_id: merchantId,
        plan_id: plan.id,
        method: 'PAID',
        status: 'PAYMENT_PENDING',
        payment_status: 'PENDING',
        payment_amount_tzs: plan.price_tzs,
        transaction_reference: reference,
        gateway_session_id: session.reference,
        checkout_url: session.checkout_url,
        payment_link_url: session.payment_link_url || session.checkout_url,
        customer_phone: cleanPhone,
      },
      include: { plan: true },
    });

    if (!merchant.is_verified && merchant.verification_status !== 'PAID_PENDING_REVIEW') {
      await tx.merchant.update({
        where: { id: merchantId },
        data: { verification_status: 'PAYMENT_PENDING' },
      });
    }

    await tx.auditLog.create({
      data: {
        merchant_id: merchantId,
        user_id: userId,
        action: 'VERIFICATION_PAYMENT_INITIATED',
        object_type: 'VERIFICATION_APPLICATION',
        object_id: app.id,
        metadata: JSON.stringify({ plan: plan.name, amount: plan.price_tzs, reference }),
      },
    });

    return app;
  });

  return application;
}

async function notifyAdminVerificationPaid(merchantName: string, planName: string, amountTzs: number) {
  try {
    const settings = await pAny.smsGlobalSetting?.findUnique?.({ where: { id: 'default' } });
    let adminPhones: string[] = ['0768828247', '0711788830'];
    if (settings?.admin_alert_phones) {
      try {
        const parsed = JSON.parse(settings.admin_alert_phones);
        if (Array.isArray(parsed) && parsed.length > 0) adminPhones = parsed;
      } catch {
        // Keep default admin phones
      }
    }

    const smsBody = `LUMO Track: A merchant has successfully paid for Verified Merchant subscription. Merchant: ${merchantName}. Plan: ${planName}. Amount: TZS ${Number(amountTzs).toLocaleString('en-US')}. Please review the application in the Admin Dashboard.`;
    for (const phone of adminPhones) {
      await smsAdapter.sendSMS(String(phone), smsBody).catch(() => null);
    }
  } catch (err) {
    console.error('[ADMIN VERIFICATION SMS ERROR]', err);
  }
}

/**
 * Idempotently records a successful verification payment.
 * IMPORTANT: Never activates verification badge directly — moves status to PAID_PENDING_REVIEW for Admin approval.
 */
export async function confirmVerificationPaymentIdempotent(
  transactionReference: string,
  gatewayReference?: string | null
) {
  const app = await pAny.verificationApplication.findFirst({
    where: {
      OR: [
        { transaction_reference: transactionReference },
        { gateway_session_id: transactionReference },
      ],
    },
    include: {
      merchant: true,
      plan: true,
    },
  });

  if (!app) {
    return null;
  }

  if (app.payment_status === 'SUCCESSFUL') {
    return app;
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx: any) => {
    // Re-read inside transaction to prevent race-condition duplicate processing
    const fresh = await tx.verificationApplication.findUnique({ where: { id: app.id } });
    if (fresh?.payment_status === 'SUCCESSFUL') {
      return fresh;
    }

    const resApp = await tx.verificationApplication.update({
      where: { id: app.id },
      data: {
        payment_status: 'SUCCESSFUL',
        status: 'PAID_PENDING_REVIEW',
        gateway_reference: gatewayReference || app.gateway_reference,
        paid_at: now,
      },
      include: { merchant: true, plan: true },
    });

    if (!app.merchant?.is_verified) {
      await tx.merchant.update({
        where: { id: app.merchant_id },
        data: { verification_status: 'PAID_PENDING_REVIEW' },
      });
    }

    await tx.auditLog.create({
      data: {
        merchant_id: app.merchant_id,
        action: 'VERIFICATION_PAYMENT_CONFIRMED',
        object_type: 'VERIFICATION_APPLICATION',
        object_id: app.id,
        metadata: JSON.stringify({
          reference: app.transaction_reference,
          amount: app.payment_amount_tzs,
          plan: app.plan?.name || 'Verification Plan',
        }),
      },
    });

    return resApp;
  });

  await notifyAdminVerificationPaid(
    app.merchant?.business_name || 'Merchant',
    app.plan?.name || 'Verification Plan',
    app.payment_amount_tzs
  );

  return updated;
}

export async function checkVerificationPaymentStatus(merchantId: string, reference: string) {
  const app = await pAny.verificationApplication.findFirst({
    where: { transaction_reference: reference, merchant_id: merchantId },
    include: { plan: true },
  });
  if (!app) throw new Error('Verification application not found');

  if (app.payment_status === 'PENDING' && app.gateway_session_id) {
    try {
      const sessionData = await snippePaymentService.getSessionStatus(app.gateway_session_id);
      const gatewayStatus = (sessionData?.status || '').toLowerCase();
      if (gatewayStatus === 'completed' || gatewayStatus === 'paid' || gatewayStatus === 'successful') {
        return confirmVerificationPaymentIdempotent(app.transaction_reference, sessionData.reference);
      }
      if (gatewayStatus === 'failed' || gatewayStatus === 'cancelled' || gatewayStatus === 'expired') {
        const mappedPay = gatewayStatus.toUpperCase();
        await pAny.verificationApplication.update({
          where: { id: app.id },
          data: { payment_status: mappedPay, status: 'NOT_VERIFIED' },
        });
      }
    } catch {
      // Non-fatal polling check
    }
  }

  return pAny.verificationApplication.findUnique({
    where: { id: app.id },
    include: { plan: true },
  });
}

export async function repushVerificationPayment(merchantId: string, reference: string, phone?: string) {
  const app = await pAny.verificationApplication.findFirst({
    where: { transaction_reference: reference, merchant_id: merchantId },
  });
  if (!app) throw new Error('Verification application not found');
  if (app.payment_status !== 'PENDING') {
    throw new Error('Only pending payments can trigger USSD push');
  }
  if (!app.gateway_session_id) {
    throw new Error('Gateway session not found for this payment');
  }

  return snippePaymentService.pushPayment(app.gateway_session_id);
}

// ================= ADMIN VERIFICATION MANAGEMENT =================

export async function getAdminVerificationOverview(search?: string) {
  await ensureDefaultVerificationPlans();
  await expireElapsedVerifications();

  const [plans, applications, merchants] = await Promise.all([
    pAny.verificationPlan.findMany({
      orderBy: [{ display_order: 'asc' }, { duration_days: 'asc' }],
    }),
    pAny.verificationApplication.findMany({
      where: search?.trim()
        ? {
            OR: [
              { transaction_reference: { contains: search.trim(), mode: 'insensitive' } },
              { merchant: { business_name: { contains: search.trim(), mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: {
        merchant: {
          include: {
            category_mappings: {
              where: { is_primary: true },
              include: { category: true },
            },
          },
        },
        plan: true,
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    }),
    pAny.merchant.findMany({
      where: search?.trim()
        ? {
            OR: [
              { business_name: { contains: search.trim(), mode: 'insensitive' } },
              { business_phone: { contains: search.trim(), mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        category_mappings: {
          where: { is_primary: true },
          include: { category: true },
        },
      },
      orderBy: [{ is_verified: 'desc' }, { created_at: 'desc' }],
      take: 100,
    }),
  ]);

  const paidApps = applications.filter((a: any) => a.payment_status === 'SUCCESSFUL' && a.method === 'PAID');
  const totalRevenueTzs = paidApps.reduce((sum: number, a: any) => sum + Number(a.payment_amount_tzs || 0), 0);

  const stats = {
    totalVerifiedMerchants: merchants.filter((m: any) => m.is_verified && m.verification_status === 'VERIFIED').length,
    paidVerificationApplications: paidApps.length,
    pendingApproval: applications.filter((a: any) => a.status === 'PAID_PENDING_REVIEW').length,
    activeSubscriptions: applications.filter((a: any) => a.status === 'VERIFIED').length,
    expiredSubscriptions: applications.filter((a: any) => a.status === 'EXPIRED').length,
    rejectedApplications: applications.filter((a: any) => a.status === 'REJECTED').length,
    totalRevenueTzs,
  };

  return { stats, plans, applications, merchants };
}

export async function createOrUpdateVerificationPlan(
  adminId: string,
  planId: string | null,
  input: {
    code?: string;
    name: string;
    description?: string;
    durationDays: number;
    priceTzs: number;
    isActive?: boolean;
    autoRenewEnabled?: boolean;
    displayOrder?: number;
  }
) {
  if (!input.name?.trim()) throw new Error('Plan name is required');
  if (Number(input.durationDays) <= 0) throw new Error('Duration days must be positive');
  if (Number(input.priceTzs) < 0) throw new Error('Price cannot be negative');

  let plan;
  if (planId) {
    plan = await pAny.verificationPlan.update({
      where: { id: planId },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        duration_days: Number(input.durationDays),
        price_tzs: Math.round(Number(input.priceTzs)),
        is_active: input.isActive !== undefined ? Boolean(input.isActive) : undefined,
        auto_renew_enabled:
          input.autoRenewEnabled !== undefined ? Boolean(input.autoRenewEnabled) : undefined,
        display_order: input.displayOrder !== undefined ? Number(input.displayOrder) : undefined,
      },
    });
  } else {
    const code = (input.code || input.name).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    plan = await pAny.verificationPlan.create({
      data: {
        code,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        duration_days: Number(input.durationDays),
        price_tzs: Math.round(Number(input.priceTzs)),
        is_active: input.isActive !== undefined ? Boolean(input.isActive) : true,
        auto_renew_enabled: Boolean(input.autoRenewEnabled),
        display_order: Number(input.displayOrder || 0),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      user_id: adminId,
      action: planId ? 'ADMIN_VERIFICATION_PLAN_UPDATED' : 'ADMIN_VERIFICATION_PLAN_CREATED',
      object_type: 'VERIFICATION_PLAN',
      object_id: plan.id,
      metadata: JSON.stringify({ name: plan.name, price_tzs: plan.price_tzs, duration_days: plan.duration_days }),
    },
  });

  return plan;
}

export async function approveVerificationApplication(adminId: string, applicationId: string, notes?: string) {
  const app = await pAny.verificationApplication.findUnique({
    where: { id: applicationId },
    include: { merchant: true, plan: true },
  });
  if (!app) throw new Error('Verification application not found');
  if (app.method === 'PAID' && app.payment_status !== 'SUCCESSFUL') {
    throw new Error('Cannot approve paid verification before payment is confirmed as SUCCESSFUL');
  }

  const durationDays = Number(app.plan?.duration_days || 30);
  const now = new Date();
  const baseDate =
    app.merchant?.is_verified && app.merchant?.verification_expires_at && new Date(app.merchant.verification_expires_at) > now
      ? new Date(app.merchant.verification_expires_at)
      : now;
  const expiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const updated = await prisma.$transaction(async (tx: any) => {
    const resApp = await tx.verificationApplication.update({
      where: { id: app.id },
      data: {
        status: 'VERIFIED',
        reviewed_by: adminId,
        reviewed_at: now,
        review_notes: notes?.trim() || null,
        activated_at: now,
        expires_at: expiresAt,
      },
      include: { merchant: true, plan: true },
    });

    await tx.merchant.update({
      where: { id: app.merchant_id },
      data: {
        is_verified: true,
        verification_status: 'VERIFIED',
        verified_at: app.merchant?.verified_at || now,
        verification_expires_at: expiresAt,
      },
    });

    await tx.auditLog.create({
      data: {
        merchant_id: app.merchant_id,
        user_id: adminId,
        action: 'ADMIN_VERIFICATION_APPROVED',
        object_type: 'VERIFICATION_APPLICATION',
        object_id: app.id,
        metadata: JSON.stringify({ expires_at: expiresAt, notes }),
      },
    });

    return resApp;
  });

  if (app.merchant?.business_phone) {
    const sms = `Congratulations ${app.merchant.business_name}! Your LUMO Track Verified Merchant Blue Badge is now active until ${expiresAt.toISOString().slice(0, 10)}.`;
    await smsAdapter.sendSMS(app.merchant.business_phone, sms).catch(() => null);
  }

  return updated;
}

export async function rejectVerificationApplication(adminId: string, applicationId: string, notes: string) {
  const app = await pAny.verificationApplication.findUnique({
    where: { id: applicationId },
    include: { merchant: true },
  });
  if (!app) throw new Error('Verification application not found');

  const now = new Date();
  const updated = await prisma.$transaction(async (tx: any) => {
    const resApp = await tx.verificationApplication.update({
      where: { id: app.id },
      data: {
        status: 'REJECTED',
        reviewed_by: adminId,
        reviewed_at: now,
        review_notes: notes?.trim() || 'Rejected by administrator',
      },
    });

    if (!app.merchant?.is_verified) {
      await tx.merchant.update({
        where: { id: app.merchant_id },
        data: { verification_status: 'REJECTED' },
      });
    }

    await tx.auditLog.create({
      data: {
        merchant_id: app.merchant_id,
        user_id: adminId,
        action: 'ADMIN_VERIFICATION_REJECTED',
        object_type: 'VERIFICATION_APPLICATION',
        object_id: app.id,
        metadata: JSON.stringify({ notes }),
      },
    });

    return resApp;
  });

  return updated;
}

export async function grantManualVerification(
  adminId: string,
  merchantId: string,
  durationDays: number = 365,
  notes?: string
) {
  const merchant = await pAny.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) throw new Error('Merchant not found');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(1, durationDays) * 24 * 60 * 60 * 1000);
  const reference = `ADMIN_VER_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const app = await prisma.$transaction(async (tx: any) => {
    const created = await tx.verificationApplication.create({
      data: {
        merchant_id: merchantId,
        method: 'ADMIN_GRANTED',
        status: 'VERIFIED',
        payment_status: 'SUCCESSFUL',
        payment_amount_tzs: 0,
        transaction_reference: reference,
        reviewed_by: adminId,
        reviewed_at: now,
        review_notes: notes?.trim() || 'Granted directly by admin',
        activated_at: now,
        expires_at: expiresAt,
      },
    });

    await tx.merchant.update({
      where: { id: merchantId },
      data: {
        is_verified: true,
        verification_status: 'VERIFIED',
        verified_at: merchant.verified_at || now,
        verification_expires_at: expiresAt,
      },
    });

    await tx.auditLog.create({
      data: {
        merchant_id: merchantId,
        user_id: adminId,
        action: 'ADMIN_MANUAL_VERIFICATION_GRANTED',
        object_type: 'MERCHANT',
        object_id: merchantId,
        metadata: JSON.stringify({ durationDays, expiresAt, notes }),
      },
    });

    return created;
  });

  return app;
}

export async function updateMerchantVerificationState(
  adminId: string,
  merchantId: string,
  action: 'EXTEND' | 'SUSPEND' | 'REVOKE',
  opts: { extraDays?: number; reason?: string }
) {
  const merchant = await pAny.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) throw new Error('Merchant not found');

  const now = new Date();
  if (action === 'EXTEND') {
    const extraDays = Math.max(1, Number(opts.extraDays || 30));
    const base =
      merchant.verification_expires_at && new Date(merchant.verification_expires_at) > now
        ? new Date(merchant.verification_expires_at)
        : now;
    const expiresAt = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx: any) => {
      await tx.merchant.update({
        where: { id: merchantId },
        data: {
          is_verified: true,
          verification_status: 'VERIFIED',
          verified_at: merchant.verified_at || now,
          verification_expires_at: expiresAt,
        },
      });
      await tx.auditLog.create({
        data: {
          merchant_id: merchantId,
          user_id: adminId,
          action: 'ADMIN_VERIFICATION_EXTENDED',
          object_type: 'MERCHANT',
          object_id: merchantId,
          metadata: JSON.stringify({ extraDays, expiresAt, reason: opts.reason }),
        },
      });
    });

    return { merchantId, status: 'VERIFIED', expiresAt };
  }

  const nextStatus = action === 'SUSPEND' ? 'SUSPENDED' : 'NOT_VERIFIED';
  await prisma.$transaction(async (tx: any) => {
    await tx.merchant.update({
      where: { id: merchantId },
      data: {
        is_verified: false,
        verification_status: nextStatus,
      },
    });
    await tx.verificationApplication.updateMany({
      where: { merchant_id: merchantId, status: 'VERIFIED' },
      data: { status: nextStatus, review_notes: opts.reason || `${action} by admin` },
    });
    await tx.auditLog.create({
      data: {
        merchant_id: merchantId,
        user_id: adminId,
        action: action === 'SUSPEND' ? 'ADMIN_VERIFICATION_SUSPENDED' : 'ADMIN_VERIFICATION_REVOKED',
        object_type: 'MERCHANT',
        object_id: merchantId,
        metadata: JSON.stringify({ reason: opts.reason }),
      },
    });
  });

  return { merchantId, status: nextStatus };
}
