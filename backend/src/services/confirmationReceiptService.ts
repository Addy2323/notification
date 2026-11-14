import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../database/prisma';
import { config } from '../config';
import { MesejiSMSAdapter, normalizePhone } from '../notifications/adapter';
import { smsManagementService } from './smsManagementService';
import { generateConfirmationReceiptPdf, ReceiptPdfData, ReceiptPdfLineItem } from './receiptPdfService';

const RECEIPTS_DIR = path.resolve(__dirname, '../../public/uploads/receipts');
const DEFAULT_EXPIRY_DAYS = 90;
const inFlightReceipts = new Set<string>();

export interface SmsRetryHistoryEntry {
  attempt: number;
  type: 'AUTOMATIC' | 'AUTO_RETRY' | 'MANUAL_RESEND';
  timestamp: string;
  status: 'SMS_SENT' | 'SMS_DELIVERED' | 'SMS_FAILED';
  providerMessageId?: string | null;
  providerResponse?: string | null;
  error?: string | null;
  triggeredBy?: string | null;
}

export function generateReceiptAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashReceiptToken(rawToken: string): string {
  return crypto.createHash('sha256').update(String(rawToken || '').trim()).digest('hex');
}

export function generateReceiptNumber(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RCP-${y}${m}${d}-${suffix}`;
}

export function buildConfirmationReceiptSmsMessage(params: {
  customerName: string;
  orderNumber: string;
  receiptLink: string;
  businessName: string;
}): string {
  const customerName = (params.customerName || 'Customer').trim();
  const cleanOrderNo = String(params.orderNumber || '').replace(/^#+/, '').trim();
  const receiptLink = String(params.receiptLink || '').trim();
  const businessName = (params.businessName || 'LUMO Track').trim();

  return `Hello ${customerName}, your order #${cleanOrderNo} has been successfully completed. Your confirmation receipt is ready!\n\nView or download your receipt here:\n${receiptLink}\n\nThank you for shopping with ${businessName}.`;
}

export function normalizePaymentStatus(
  rawStatus?: string | null,
  amountPaid?: number,
  grandTotal?: number
): 'PAID' | 'PARTIALLY PAID' | 'UNPAID' | 'REFUNDED' {
  const normalized = String(rawStatus || 'UNPAID').toUpperCase().trim().replace(/_/g, ' ');
  if (normalized === 'REFUNDED') return 'REFUNDED';
  if (normalized === 'PAID') return 'PAID';
  if (normalized === 'PARTIALLY PAID') return 'PARTIALLY PAID';
  if (
    typeof amountPaid === 'number' &&
    typeof grandTotal === 'number' &&
    amountPaid > 0 &&
    grandTotal > 0 &&
    amountPaid < grandTotal
  ) {
    return 'PARTIALLY PAID';
  }
  return 'UNPAID';
}

export function reconcileOrderFinancials(order: any): {
  items: ReceiptPdfLineItem[];
  subtotal: number;
  discountTotal: number;
  deliveryCharges: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: 'PAID' | 'PARTIALLY PAID' | 'UNPAID' | 'REFUNDED';
  currency: string;
} {
  const currency = (order.currency || 'TZS').toUpperCase();
  const rawItems: any[] = Array.isArray(order.items) ? order.items : [];

  let items: ReceiptPdfLineItem[] = [];
  let subtotal = 0;
  let itemDiscountTotal = 0;

  if (rawItems.length > 0) {
    items = rawItems.map((it) => {
      const qty = Math.max(1, Number(it.quantity || 1));
      const unitPrice = Number(it.unit_selling_price ?? 0);
      const itemDisc = Math.max(0, Number(it.discount ?? 0));
      const grossLine = unitPrice * qty;
      const lineTotal = it.subtotal !== undefined && it.subtotal !== null ? Number(it.subtotal) : Math.max(0, grossLine - itemDisc);
      subtotal += grossLine;
      itemDiscountTotal += itemDisc;
      return {
        productName: it.product_name_snapshot || order.product_name || 'Order Item',
        description: it.product_description_snapshot || null,
        sku: it.product_sku_snapshot || null,
        quantity: qty,
        unitPrice,
        discount: itemDisc,
        lineTotal,
      };
    });
  } else {
    const baseAmount = Math.max(0, Number(order.total_revenue ?? order.amount ?? 0));
    subtotal = baseAmount;
    items = [
      {
        productName: order.product_name || 'Order Item',
        description: null,
        sku: null,
        quantity: 1,
        unitPrice: baseAmount,
        discount: 0,
        lineTotal: baseAmount,
      },
    ];
  }

  const orderLevelDiscount = Math.max(0, Number(order.discount_amount ?? 0));
  const discountTotal = Number((itemDiscountTotal + orderLevelDiscount).toFixed(2));
  const deliveryCharges = Math.max(0, Number(order.delivery_fee ?? 0));
  const taxTotal = Math.max(0, Number(order.tax_amount ?? 0));

  const computedGrandTotal = Math.max(0, Number((subtotal - discountTotal + deliveryCharges + taxTotal).toFixed(2)));
  const rawPaid = Math.max(0, Number(order.amount_paid ?? 0));
  const paymentStatus = normalizePaymentStatus(order.payment_status, rawPaid, computedGrandTotal);

  let amountPaid = 0;
  let outstandingBalance = computedGrandTotal;

  if (paymentStatus === 'REFUNDED') {
    amountPaid = 0;
    outstandingBalance = 0;
  } else if (paymentStatus === 'PAID') {
    amountPaid = rawPaid > 0 ? Math.min(computedGrandTotal, rawPaid) : computedGrandTotal;
    outstandingBalance = Math.max(0, Number((computedGrandTotal - amountPaid).toFixed(2)));
  } else if (paymentStatus === 'PARTIALLY PAID') {
    amountPaid = Math.min(computedGrandTotal, rawPaid);
    outstandingBalance = Math.max(0, Number((computedGrandTotal - amountPaid).toFixed(2)));
  } else {
    amountPaid = 0;
    outstandingBalance = computedGrandTotal;
  }

  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal,
    deliveryCharges,
    taxTotal,
    grandTotal: computedGrandTotal,
    amountPaid: Number(amountPaid.toFixed(2)),
    outstandingBalance,
    paymentStatus,
    currency,
  };
}

function buildPdfDataFromOrderAndReceipt(order: any, receipt: any): ReceiptPdfData {
  const financials = reconcileOrderFinancials(order);
  const merchant = order.merchant || {};
  const customer = order.customer || {};

  return {
    receiptNumber: receipt.receipt_number,
    orderNumber: order.order_number,
    receiptGeneratedAt: receipt.generated_at ? new Date(receipt.generated_at) : new Date(),
    orderCompletedAt: receipt.order_completed_at
      ? new Date(receipt.order_completed_at)
      : order.completed_at || order.delivered_at || new Date(),
    transactionReference: receipt.transaction_reference || order.transaction_reference || null,
    orderStatus: order.status,
    paymentStatus: financials.paymentStatus,
    currency: financials.currency,
    merchant: {
      businessName: merchant.business_name || 'LUMO Partner Merchant',
      logoUrl: merchant.logo_url || null,
      brandColor: merchant.brand_color || '#0F172A',
      address: merchant.location || null,
      phone: merchant.business_phone || null,
      email: merchant.email || null,
      website: merchant.website || null,
    },
    customer: {
      name: order.customer_name || customer.name || 'Customer',
      phone: order.customer_phone || customer.phone || '',
      deliveryAddress: order.delivery_address || customer.delivery_address || null,
    },
    items: financials.items,
    financials: {
      subtotal: financials.subtotal,
      discountTotal: financials.discountTotal,
      deliveryCharges: financials.deliveryCharges,
      taxTotal: financials.taxTotal,
      grandTotal: financials.grandTotal,
      amountPaid: financials.amountPaid,
      outstandingBalance: financials.outstandingBalance,
    },
  };
}

function ensureReceiptsDirectory(): void {
  if (!fs.existsSync(RECEIPTS_DIR)) {
    fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
  }
}

function writeReceiptPdfToDisk(receiptNumber: string, buffer: Buffer): string {
  ensureReceiptsDirectory();
  const safeName = receiptNumber.replace(/[^A-Za-z0-9_-]/g, '_');
  const filePath = path.join(RECEIPTS_DIR, `${safeName}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function parseRetryHistory(raw?: string | null): SmsRetryHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function refundUnacceptedSmsCredits(params: {
  merchantId: string;
  units: number;
  reason: string;
  reference: string;
}): Promise<void> {
  const { merchantId, units, reason, reference } = params;
  if (!units || units <= 0 || !prisma.merchantSmsAccount) return;

  try {
    await prisma.$transaction(async (tx: any) => {
      const account = await tx.merchantSmsAccount.findUnique({
        where: { merchant_id: merchantId },
      });
      if (!account) return;

      const balanceBefore = account.available_credits;
      const balanceAfter = balanceBefore + units;
      const newConsumed = Math.max(0, account.total_consumed - units);

      await tx.merchantSmsAccount.update({
        where: { id: account.id },
        data: {
          available_credits: balanceAfter,
          total_consumed: newConsumed,
        },
      });

      await tx.smsCreditLedger.create({
        data: {
          merchant_id: merchantId,
          amount: units,
          type: 'REFUND',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference,
          reason,
        },
      });
    });
  } catch (err) {
    console.error('[CONFIRMATION RECEIPT SMS CREDIT REFUND ERROR]', err);
  }
}

export async function dispatchConfirmationReceiptSms(
  receiptId: string,
  options?: {
    type?: 'AUTOMATIC' | 'AUTO_RETRY' | 'MANUAL_RESEND';
    triggeredBy?: string;
    allowAutoRetryOnFailure?: boolean;
  }
): Promise<any> {
  const dispatchType = options?.type || 'AUTOMATIC';
  const receipt = await (prisma as any).confirmationReceipt.findUnique({
    where: { id: receiptId },
    include: {
      order: {
        include: {
          merchant: true,
        },
      },
    },
  });

  if (!receipt || !receipt.order) {
    throw new Error('Confirmation receipt not found');
  }

  if (receipt.status === 'REVOKED' || receipt.revoked_at) {
    throw new Error('Cannot send SMS for a revoked confirmation receipt.');
  }

  const order = receipt.order;
  const merchantName = order.merchant?.business_name || 'LUMO Track';
  const receiptLink = `${config.frontendUrl}/receipt/${receipt.public_token}`;
  const messageBody = buildConfirmationReceiptSmsMessage({
    customerName: order.customer_name || 'Customer',
    orderNumber: order.order_number,
    receiptLink,
    businessName: merchantName,
  });

  const history = parseRetryHistory(receipt.sms_retry_history);
  const attemptNo = history.length + 1;

  // Create notification ledger record with deterministic idempotency for AUTOMATIC sends
  const idempotencyKey =
    dispatchType === 'AUTOMATIC'
      ? `RECEIPT_PDF:${order.id}:AUTO`
      : `RECEIPT_PDF:${order.id}:${dispatchType}:${attemptNo}:${Date.now()}`;

  const existingAutoNotif =
    dispatchType === 'AUTOMATIC'
      ? await prisma.orderNotification.findUnique({ where: { idempotency_key: idempotencyKey } })
      : null;

  const notif =
    existingAutoNotif ||
    (await prisma.orderNotification.create({
      data: {
        order_id: order.id,
        event_type:
          dispatchType === 'MANUAL_RESEND'
            ? 'CONFIRMATION_RECEIPT_SMS_RESENT'
            : 'CONFIRMATION_RECEIPT_SMS',
        recipient_type: 'CUSTOMER',
        recipient_phone: order.customer_phone,
        message_body: messageBody,
        idempotency_key: idempotencyKey,
        channel: 'SMS',
        status: 'QUEUED',
      },
    }));

  // 1. Respect SMS credit balance & TSh 20/unit billing
  const deductRes = await smsManagementService.deductCredits({
    merchantId: order.merchant_id,
    messageBody,
    reason: `Order #${order.order_number} Confirmation Receipt SMS (${dispatchType})`,
    reference: receipt.receipt_number,
  });

  if (!deductRes.allowed) {
    const reason = `Insufficient merchant SMS credits (${deductRes.remainingCredits} available, needed ${deductRes.units}).`;
    const failedEntry: SmsRetryHistoryEntry = {
      attempt: attemptNo,
      type: dispatchType,
      timestamp: new Date().toISOString(),
      status: 'SMS_FAILED',
      error: reason,
      triggeredBy: options?.triggeredBy || null,
    };
    history.push(failedEntry);

    await prisma.orderNotification.update({
      where: { id: notif.id },
      data: {
        status: 'FAILED',
        failed_at: new Date(),
        failure_reason: reason,
      },
    });

    return (prisma as any).confirmationReceipt.update({
      where: { id: receipt.id },
      data: {
        sms_status: 'SMS_FAILED',
        sms_message_body: messageBody,
        sms_failed_at: new Date(),
        sms_failure_reason: reason,
        sms_retry_count: attemptNo,
        sms_retry_history: JSON.stringify(history),
      },
    });
  }

  // 2. Dispatch via existing MesejiSMSAdapter
  const adapter = new MesejiSMSAdapter();
  const recipient = normalizePhone(order.customer_phone) || order.customer_phone;
  const smsResult = await adapter.sendSMS(recipient, messageBody);
  const now = new Date();

  if (smsResult.success) {
    const sentEntry: SmsRetryHistoryEntry = {
      attempt: attemptNo,
      type: dispatchType,
      timestamp: now.toISOString(),
      status: 'SMS_SENT',
      providerMessageId: smsResult.messageId || null,
      providerResponse: JSON.stringify(smsResult),
      triggeredBy: options?.triggeredBy || null,
    };
    history.push(sentEntry);

    await prisma.orderNotification.update({
      where: { id: notif.id },
      data: {
        status: 'SENT',
        provider_message_id: smsResult.messageId || null,
        sent_at: now,
        delivered_at: null,
        failed_at: null,
        failure_reason: null,
      },
    });

    return (prisma as any).confirmationReceipt.update({
      where: { id: receipt.id },
      data: {
        sms_status: 'SMS_SENT',
        sms_recipient_phone: order.customer_phone,
        sms_message_body: messageBody,
        sms_provider_message_id: smsResult.messageId || null,
        sms_provider_response: JSON.stringify(smsResult),
        sms_sent_at: now,
        sms_failed_at: null,
        sms_failure_reason: null,
        sms_retry_count: attemptNo,
        sms_retry_history: JSON.stringify(history),
      },
    });
  }

  // 3. Provider rejected / unreachable: refund billed credits so merchant is not charged
  await refundUnacceptedSmsCredits({
    merchantId: order.merchant_id,
    units: deductRes.units,
    reason: `Refund unaccepted Confirmation Receipt SMS for #${order.order_number}`,
    reference: receipt.receipt_number,
  });

  const errorMessage = smsResult.error || 'SMS provider rejected or failed to accept message.';
  const failedEntry: SmsRetryHistoryEntry = {
    attempt: attemptNo,
    type: dispatchType,
    timestamp: now.toISOString(),
    status: 'SMS_FAILED',
    providerResponse: JSON.stringify(smsResult),
    error: errorMessage,
    triggeredBy: options?.triggeredBy || null,
  };
  history.push(failedEntry);

  await prisma.orderNotification.update({
    where: { id: notif.id },
    data: {
      status: 'FAILED',
      failed_at: now,
      failure_reason: errorMessage,
    },
  });

  const updated = await (prisma as any).confirmationReceipt.update({
    where: { id: receipt.id },
    data: {
      sms_status: 'SMS_FAILED',
      sms_recipient_phone: order.customer_phone,
      sms_message_body: messageBody,
      sms_provider_response: JSON.stringify(smsResult),
      sms_failed_at: now,
      sms_failure_reason: errorMessage,
      sms_retry_count: attemptNo,
      sms_retry_history: JSON.stringify(history),
    },
  });

  // 4. Safe background retry once for transient provider failure (non-blocking)
  if (
    options?.allowAutoRetryOnFailure &&
    dispatchType === 'AUTOMATIC' &&
    attemptNo < 2 &&
    process.env.NODE_ENV !== 'test'
  ) {
    const timer = setTimeout(() => {
      dispatchConfirmationReceiptSms(receipt.id, {
        type: 'AUTO_RETRY',
        triggeredBy: 'SYSTEM_RETRY',
        allowAutoRetryOnFailure: false,
      }).catch((err) => console.error('[CONFIRMATION RECEIPT AUTO RETRY ERROR]', err));
    }, 15000);
    if (typeof timer.unref === 'function') timer.unref();
  }

  return updated;
}

/**
 * Generates (idempotently) the Confirmation Receipt PDF and dispatches the customer SMS
 * whenever an order reaches COMPLETED or DELIVERED.
 */
export async function triggerConfirmationReceipt(
  orderId: string,
  options?: { triggeredBy?: string; syncSms?: boolean }
): Promise<any> {
  if (inFlightReceipts.has(orderId)) {
    return (prisma as any).confirmationReceipt.findUnique({ where: { order_id: orderId } });
  }
  inFlightReceipts.add(orderId);

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: true,
        customer: true,
        items: true,
        confirmation_receipt: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Rule: Generate confirmation receipts ONLY for completed/delivered orders
    if (order.status !== 'COMPLETED' && order.status !== 'DELIVERED') {
      return null;
    }

    // Rule: Do not generate duplicate receipts or duplicate automatic SMS on repeated completion calls
    if (order.confirmation_receipt && order.confirmation_receipt.status === 'GENERATED') {
      return order.confirmation_receipt;
    }

    const financials = reconcileOrderFinancials(order);
    const now = new Date();
    const completedAt = order.completed_at || order.delivered_at || now;
    const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const existingFailed = order.confirmation_receipt;
    const receiptNumber = existingFailed?.receipt_number || generateReceiptNumber(now);
    const rawToken = existingFailed?.public_token || generateReceiptAccessToken();
    const tokenHash = hashReceiptToken(rawToken);
    const receiptLink = `${config.frontendUrl}/receipt/${rawToken}`;
    const merchantName = order.merchant?.business_name || 'LUMO Track';
    const messageBody = buildConfirmationReceiptSmsMessage({
      customerName: order.customer_name || 'Customer',
      orderNumber: order.order_number,
      receiptLink,
      businessName: merchantName,
    });

    const pdfData = buildPdfDataFromOrderAndReceipt(order, {
      receipt_number: receiptNumber,
      generated_at: now,
      order_completed_at: completedAt,
      transaction_reference: order.transaction_reference || null,
    });

    let pdfBuffer: Buffer;
    let pdfPath: string | null = null;
    try {
      pdfBuffer = await generateConfirmationReceiptPdf(pdfData);
      pdfPath = writeReceiptPdfToDisk(receiptNumber, pdfBuffer);
    } catch (pdfErr: any) {
      const errorMsg = pdfErr?.message || 'PDF generation failed';
      if (existingFailed) {
        await (prisma as any).confirmationReceipt.update({
          where: { id: existingFailed.id },
          data: { status: 'FAILED', generation_error: errorMsg },
        });
      } else {
        await (prisma as any).confirmationReceipt.create({
          data: {
            receipt_number: receiptNumber,
            order_id: order.id,
            merchant_id: order.merchant_id,
            customer_id: order.customer_id || null,
            access_token_hash: tokenHash,
            public_token: rawToken,
            status: 'FAILED',
            payment_status_snapshot: financials.paymentStatus,
            currency: financials.currency,
            subtotal: financials.subtotal,
            discount_total: financials.discountTotal,
            delivery_charges: financials.deliveryCharges,
            tax_total: financials.taxTotal,
            grand_total: financials.grandTotal,
            amount_paid: financials.amountPaid,
            outstanding_balance: financials.outstandingBalance,
            transaction_reference: order.transaction_reference || null,
            generated_at: now,
            order_completed_at: completedAt,
            expires_at: expiresAt,
            sms_status: 'SMS_PENDING',
            sms_recipient_phone: order.customer_phone,
            sms_message_body: messageBody,
            generation_error: errorMsg,
          },
        });
      }
      throw pdfErr;
    }

    const receiptPayload = {
      receipt_number: receiptNumber,
      order_id: order.id,
      merchant_id: order.merchant_id,
      customer_id: order.customer_id || null,
      access_token_hash: tokenHash,
      public_token: rawToken,
      status: 'GENERATED',
      payment_status_snapshot: financials.paymentStatus,
      currency: financials.currency,
      subtotal: financials.subtotal,
      discount_total: financials.discountTotal,
      delivery_charges: financials.deliveryCharges,
      tax_total: financials.taxTotal,
      grand_total: financials.grandTotal,
      amount_paid: financials.amountPaid,
      outstanding_balance: financials.outstandingBalance,
      transaction_reference: order.transaction_reference || null,
      pdf_storage_path: pdfPath,
      pdf_size_bytes: pdfBuffer.length,
      generated_at: now,
      order_completed_at: completedAt,
      expires_at: expiresAt,
      sms_status: 'SMS_PENDING',
      sms_recipient_phone: order.customer_phone,
      sms_message_body: messageBody,
      generation_error: null,
    };

    const receipt = existingFailed
      ? await (prisma as any).confirmationReceipt.update({
          where: { id: existingFailed.id },
          data: receiptPayload,
        })
      : await (prisma as any).confirmationReceipt.create({
          data: receiptPayload,
        });

    await prisma.orderEvent.create({
      data: {
        order_id: order.id,
        event_type: 'CONFIRMATION_RECEIPT_GENERATED',
        actor_type: 'SYSTEM',
        actor_reference: options?.triggeredBy || 'AUTO_COMPLETE_WORKFLOW',
        metadata: JSON.stringify({
          receiptNumber,
          paymentStatus: financials.paymentStatus,
          grandTotal: financials.grandTotal,
        }),
      },
    });

    if (options?.syncSms) {
      return await dispatchConfirmationReceiptSms(receipt.id, {
        type: 'AUTOMATIC',
        triggeredBy: options?.triggeredBy || 'SYSTEM',
        allowAutoRetryOnFailure: true,
      });
    }

    setImmediate(() => {
      dispatchConfirmationReceiptSms(receipt.id, {
        type: 'AUTOMATIC',
        triggeredBy: options?.triggeredBy || 'SYSTEM',
        allowAutoRetryOnFailure: true,
      }).catch((err) => {
        console.error('[CONFIRMATION RECEIPT SMS ASYNC ERROR]', err);
      });
    });

    return receipt;
  } finally {
    inFlightReceipts.delete(orderId);
  }
}

/**
 * Syncs an existing generated receipt's financial & payment status snapshot and refreshes the PDF
 * when payment records are updated after order completion.
 */
export async function syncReceiptFinancialSnapshot(orderId: string): Promise<any | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      merchant: true,
      customer: true,
      items: true,
      confirmation_receipt: true,
    },
  });

  if (!order || !order.confirmation_receipt) return null;

  const receipt = order.confirmation_receipt;
  const financials = reconcileOrderFinancials(order);
  const pdfData = buildPdfDataFromOrderAndReceipt(order, receipt);
  const pdfBuffer = await generateConfirmationReceiptPdf(pdfData);
  const pdfPath = writeReceiptPdfToDisk(receipt.receipt_number, pdfBuffer);

  return (prisma as any).confirmationReceipt.update({
    where: { id: receipt.id },
    data: {
      payment_status_snapshot: financials.paymentStatus,
      currency: financials.currency,
      subtotal: financials.subtotal,
      discount_total: financials.discountTotal,
      delivery_charges: financials.deliveryCharges,
      tax_total: financials.taxTotal,
      grand_total: financials.grandTotal,
      amount_paid: financials.amountPaid,
      outstanding_balance: financials.outstandingBalance,
      transaction_reference: order.transaction_reference || receipt.transaction_reference || null,
      pdf_storage_path: pdfPath,
      pdf_size_bytes: pdfBuffer.length,
    },
  });
}

/**
 * Resends the Confirmation Receipt SMS reusing the existing valid receipt link.
 */
export async function resendConfirmationReceiptSms(params: {
  orderId: string;
  merchantId?: string | null;
  actorId: string;
  actorName: string;
  isAdmin?: boolean;
}) {
  const { orderId, merchantId, actorId, actorName, isAdmin } = params;
  const order = await prisma.order.findFirst({
    where: isAdmin ? { id: orderId } : { id: orderId, merchant_id: merchantId! },
    include: { confirmation_receipt: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== 'COMPLETED' && order.status !== 'DELIVERED') {
    throw new Error('Confirmation receipts are only available for completed orders.');
  }

  let receipt = order.confirmation_receipt;
  if (!receipt || receipt.status === 'FAILED') {
    receipt = await triggerConfirmationReceipt(order.id, { triggeredBy: actorName, syncSms: true });
    return { receipt, message: 'Confirmation receipt generated and SMS dispatched.' };
  }

  if (receipt.status === 'REVOKED' || receipt.revoked_at) {
    throw new Error('This confirmation receipt has been revoked and cannot be resent.');
  }

  // Prevent accidental rapid duplicate resends within 15 seconds if the last attempt succeeded or is pending
  const history = parseRetryHistory(receipt.sms_retry_history);
  const lastEntry = history[history.length - 1];
  if (lastEntry && lastEntry.status !== 'SMS_FAILED') {
    const elapsedMs = Date.now() - new Date(lastEntry.timestamp).getTime();
    if (elapsedMs < 15000) {
      throw new Error('A confirmation receipt SMS was just sent. Please wait a few seconds before resending.');
    }
  }

  const updated = await dispatchConfirmationReceiptSms(receipt.id, {
    type: 'MANUAL_RESEND',
    triggeredBy: actorName,
    allowAutoRetryOnFailure: false,
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: order.merchant_id,
      user_id: isAdmin ? null : actorId,
      admin_id: isAdmin ? actorId : null,
      action: 'CONFIRMATION_RECEIPT_SMS_RESENT',
      object_type: 'CONFIRMATION_RECEIPT',
      object_id: receipt.id,
      metadata: JSON.stringify({
        order_number: order.order_number,
        receipt_number: receipt.receipt_number,
        sms_status: updated.sms_status,
      }),
    },
  });

  return {
    receipt: updated,
    message:
      updated.sms_status === 'SMS_SENT'
        ? 'Confirmation receipt SMS resent successfully.'
        : updated.sms_failure_reason || 'SMS dispatch failed',
  };
}

/**
 * Revokes a confirmation receipt link so public token access is immediately blocked.
 */
export async function revokeConfirmationReceipt(params: {
  orderId: string;
  merchantId?: string | null;
  actorId: string;
  actorName: string;
  reason?: string;
  isAdmin?: boolean;
}) {
  const { orderId, merchantId, actorId, actorName, reason, isAdmin } = params;
  const order = await prisma.order.findFirst({
    where: isAdmin ? { id: orderId } : { id: orderId, merchant_id: merchantId! },
    include: { confirmation_receipt: true },
  });

  if (!order) throw new Error('Order not found');
  if (!order.confirmation_receipt) throw new Error('No confirmation receipt exists for this order.');

  const updated = await (prisma as any).confirmationReceipt.update({
    where: { id: order.confirmation_receipt.id },
    data: {
      status: 'REVOKED',
      revoked_at: new Date(),
      revoked_by: actorName,
      revocation_reason: reason || 'Revoked by authorized staff',
    },
  });

  await prisma.auditLog.create({
    data: {
      merchant_id: order.merchant_id,
      user_id: isAdmin ? null : actorId,
      admin_id: isAdmin ? actorId : null,
      action: 'CONFIRMATION_RECEIPT_REVOKED',
      object_type: 'CONFIRMATION_RECEIPT',
      object_id: updated.id,
      metadata: JSON.stringify({
        order_number: order.order_number,
        receipt_number: updated.receipt_number,
        reason: updated.revocation_reason,
      }),
    },
  });

  return updated;
}

/**
 * Public: Validate token via SHA-256 hash and return sanitized receipt view data.
 * Never exposes internal database IDs, cost prices, or token hashes.
 */
export async function getPublicReceiptByToken(rawToken: string) {
  if (!rawToken || rawToken.trim().length < 16) {
    return { status: 'NOT_FOUND' as const };
  }

  const tokenHash = hashReceiptToken(rawToken);
  const receipt = await (prisma as any).confirmationReceipt.findUnique({
    where: { access_token_hash: tokenHash },
    include: {
      order: {
        include: {
          merchant: true,
          customer: true,
          items: true,
        },
      },
    },
  });

  if (!receipt || !receipt.order) {
    return { status: 'NOT_FOUND' as const };
  }

  if (receipt.status === 'REVOKED' || receipt.revoked_at) {
    return { status: 'REVOKED' as const, receiptNumber: receipt.receipt_number };
  }

  if (receipt.expires_at && new Date(receipt.expires_at).getTime() < Date.now()) {
    return { status: 'EXPIRED' as const, receiptNumber: receipt.receipt_number };
  }

  const pdfData = buildPdfDataFromOrderAndReceipt(receipt.order, receipt);

  return {
    status: 'VALID' as const,
    receipt: {
      receiptNumber: pdfData.receiptNumber,
      orderNumber: pdfData.orderNumber,
      receiptGeneratedAt: pdfData.receiptGeneratedAt.toISOString(),
      orderCompletedAt: pdfData.orderCompletedAt.toISOString(),
      transactionReference: pdfData.transactionReference,
      orderStatus: pdfData.orderStatus === 'DELIVERED' ? 'COMPLETED' : pdfData.orderStatus,
      paymentStatus: pdfData.paymentStatus,
      currency: pdfData.currency,
      merchant: pdfData.merchant,
      customer: pdfData.customer,
      items: pdfData.items,
      financials: pdfData.financials,
    },
  };
}

/**
 * Public: Streams/returns actual PDF Buffer after validating SHA-256 token hash, expiry, and revocation.
 */
export async function getPublicReceiptPdfBuffer(rawToken: string): Promise<{
  status: 'VALID' | 'NOT_FOUND' | 'REVOKED' | 'EXPIRED';
  buffer?: Buffer;
  filename?: string;
}> {
  if (!rawToken || rawToken.trim().length < 16) {
    return { status: 'NOT_FOUND' };
  }

  const tokenHash = hashReceiptToken(rawToken);
  const receipt = await (prisma as any).confirmationReceipt.findUnique({
    where: { access_token_hash: tokenHash },
    include: {
      order: {
        include: {
          merchant: true,
          customer: true,
          items: true,
        },
      },
    },
  });

  if (!receipt || !receipt.order) {
    return { status: 'NOT_FOUND' };
  }

  if (receipt.status === 'REVOKED' || receipt.revoked_at) {
    return { status: 'REVOKED' };
  }

  if (receipt.expires_at && new Date(receipt.expires_at).getTime() < Date.now()) {
    return { status: 'EXPIRED' };
  }

  const filename = `Confirmation-Receipt-${receipt.receipt_number}.pdf`;
  if (receipt.pdf_storage_path && fs.existsSync(receipt.pdf_storage_path)) {
    try {
      return { status: 'VALID', buffer: fs.readFileSync(receipt.pdf_storage_path), filename };
    } catch {
      // Fallback to dynamic regeneration below
    }
  }

  const pdfData = buildPdfDataFromOrderAndReceipt(receipt.order, receipt);
  const buffer = await generateConfirmationReceiptPdf(pdfData);
  const pdfPath = writeReceiptPdfToDisk(receipt.receipt_number, buffer);
  await (prisma as any).confirmationReceipt.update({
    where: { id: receipt.id },
    data: { pdf_storage_path: pdfPath, pdf_size_bytes: buffer.length },
  });

  return { status: 'VALID', buffer, filename };
}

/**
 * Merchant / Admin: Get PDF buffer for an order's confirmation receipt.
 */
export async function getOrderReceiptPdfBuffer(params: {
  orderId: string;
  merchantId?: string | null;
  isAdmin?: boolean;
}): Promise<{ buffer: Buffer; filename: string; receiptNumber: string }> {
  const order = await prisma.order.findFirst({
    where: params.isAdmin ? { id: params.orderId } : { id: params.orderId, merchant_id: params.merchantId! },
    include: {
      merchant: true,
      customer: true,
      items: true,
      confirmation_receipt: true,
    },
  });

  if (!order) throw new Error('Order not found');
  if (order.status !== 'COMPLETED' && order.status !== 'DELIVERED') {
    throw new Error('Confirmation receipt PDF is only available for completed orders.');
  }

  let receipt = order.confirmation_receipt;
  if (!receipt || receipt.status === 'FAILED') {
    receipt = await triggerConfirmationReceipt(order.id, { triggeredBy: 'ON_DEMAND_VIEW' });
  }
  if (!receipt) {
    throw new Error('Unable to generate confirmation receipt PDF for this order.');
  }

  const pdfData = buildPdfDataFromOrderAndReceipt(order, receipt);
  const buffer = await generateConfirmationReceiptPdf(pdfData);
  const pdfPath = writeReceiptPdfToDisk(receipt.receipt_number, buffer);
  await (prisma as any).confirmationReceipt.update({
    where: { id: receipt.id },
    data: { pdf_storage_path: pdfPath, pdf_size_bytes: buffer.length },
  });

  return {
    buffer,
    filename: `Confirmation-Receipt-${receipt.receipt_number}.pdf`,
    receiptNumber: receipt.receipt_number,
  };
}

/**
 * Merchant / Admin: Format receipt status summary for Order Detail dashboard.
 */
export function formatReceiptSummary(receipt: any) {
  if (!receipt) return null;
  const retryHistory = parseRetryHistory(receipt.sms_retry_history);
  return {
    id: receipt.id,
    receipt_number: receipt.receipt_number,
    status: receipt.status,
    display_receipt_status: receipt.status === 'REVOKED' ? 'RECEIPT REVOKED' : receipt.status === 'FAILED' ? 'RECEIPT FAILED' : 'RECEIPT GENERATED',
    payment_status_snapshot: receipt.payment_status_snapshot,
    currency: receipt.currency,
    subtotal: Number(receipt.subtotal),
    discount_total: Number(receipt.discount_total),
    delivery_charges: Number(receipt.delivery_charges),
    tax_total: Number(receipt.tax_total),
    grand_total: Number(receipt.grand_total),
    amount_paid: Number(receipt.amount_paid),
    outstanding_balance: Number(receipt.outstanding_balance),
    transaction_reference: receipt.transaction_reference,
    generated_at: receipt.generated_at,
    order_completed_at: receipt.order_completed_at,
    expires_at: receipt.expires_at,
    revoked_at: receipt.revoked_at,
    revoked_by: receipt.revoked_by,
    revocation_reason: receipt.revocation_reason,
    sms_status: receipt.sms_status,
    sms_recipient_phone: receipt.sms_recipient_phone,
    sms_sent_at: receipt.sms_sent_at,
    sms_delivered_at: receipt.sms_delivered_at,
    sms_failed_at: receipt.sms_failed_at,
    sms_failure_reason: receipt.sms_failure_reason,
    sms_retry_count: receipt.sms_retry_count,
    sms_retry_history: retryHistory,
    generation_error: receipt.generation_error,
    receipt_url: receipt.public_token ? `${config.frontendUrl}/receipt/${receipt.public_token}` : null,
    public_token: receipt.public_token,
  };
}

/**
 * Admin: Comprehensive Confirmation Receipt operations overview, KPIs, and notification history.
 */
export async function getAdminConfirmationReceiptsOverview(options: {
  search?: string;
  status?: string;
  smsStatus?: string;
  merchantId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (options.merchantId) where.merchant_id = options.merchantId;
  if (options.status && options.status !== 'ALL') where.status = options.status;
  if (options.smsStatus && options.smsStatus !== 'ALL') where.sms_status = options.smsStatus;
  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.OR = [
      { receipt_number: { contains: s, mode: 'insensitive' } },
      { sms_recipient_phone: { contains: s } },
      { order: { order_number: { contains: s, mode: 'insensitive' } } },
      { order: { customer_name: { contains: s, mode: 'insensitive' } } },
      { merchant: { business_name: { contains: s, mode: 'insensitive' } } },
    ];
  }

  const [
    totalReceiptsGenerated,
    smsNotificationsSent,
    smsNotificationsDelivered,
    failedSmsNotifications,
    pendingReceiptJobs,
    receiptGenerationFailures,
    revokedReceipts,
    totalCount,
    receipts,
    notificationHistory,
  ] = await Promise.all([
    (prisma as any).confirmationReceipt.count({ where: { status: 'GENERATED' } }),
    (prisma as any).confirmationReceipt.count({ where: { sms_status: { in: ['SMS_SENT', 'SMS_DELIVERED'] } } }),
    (prisma as any).confirmationReceipt.count({ where: { sms_status: 'SMS_DELIVERED' } }),
    (prisma as any).confirmationReceipt.count({ where: { sms_status: 'SMS_FAILED' } }),
    (prisma as any).confirmationReceipt.count({
      where: {
        OR: [{ status: 'PENDING' }, { sms_status: 'SMS_PENDING' }],
      },
    }),
    (prisma as any).confirmationReceipt.count({ where: { status: 'FAILED' } }),
    (prisma as any).confirmationReceipt.count({ where: { status: 'REVOKED' } }),
    (prisma as any).confirmationReceipt.count({ where }),
    (prisma as any).confirmationReceipt.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            customer_name: true,
            customer_phone: true,
            status: true,
            payment_status: true,
          },
        },
        merchant: {
          select: {
            id: true,
            business_name: true,
            business_phone: true,
          },
        },
      },
    }),
    prisma.orderNotification.findMany({
      where: {
        event_type: { in: ['CONFIRMATION_RECEIPT_SMS', 'CONFIRMATION_RECEIPT_SMS_RESENT'] },
      },
      orderBy: { created_at: 'desc' },
      take: 30,
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            customer_name: true,
            merchant: { select: { id: true, business_name: true } },
          },
        },
      },
    }),
  ]);

  return {
    kpis: {
      totalReceiptsGenerated,
      smsNotificationsSent,
      smsNotificationsDelivered,
      failedSmsNotifications,
      pendingReceiptJobs,
      receiptGenerationFailures,
      revokedReceipts,
    },
    receipts: receipts.map((r: any) => ({
      ...formatReceiptSummary(r),
      order: r.order,
      merchant: r.merchant,
    })),
    notificationHistory,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  };
}
