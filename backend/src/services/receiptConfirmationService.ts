import { prisma } from '../database/prisma';
import { MesejiSMSAdapter, normalizePhone } from '../notifications/adapter';
import { config } from '../config';
import { Language } from '../localization';
import crypto from 'crypto';

const smsAdapter = new MesejiSMSAdapter();

export interface InvestigationNoteItem {
  id: string;
  author: string;
  role: string;
  text: string;
  created_at: string;
}

/**
 * Ensures default settings exist in the database.
 */
export async function getReceiptConfirmationSettings() {
  let settings = await (prisma as any).receiptConfirmationSetting.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    settings = await (prisma as any).receiptConfirmationSetting.create({
      data: {
        id: 'default',
        auto_confirm_enabled: true,
        send_delay_seconds: 0,
        reminder_enabled: false,
        reminder_delay_hours: 24,
        max_reminders: 1,
        template_en:
          'Hello {{customerName}}, have you received your order #{{orderNumber}}? Please confirm here: {{confirmationLink}}',
        template_sw:
          'Habari {{customerName}}, umepokea oda yako #{{orderNumber}}? Tafadhali thibitisha hapa: {{confirmationLink}}',
        thank_you_en:
          "Thank you for shopping with us! We're glad you received your order. We appreciate your support.",
        thank_you_sw:
          'Asante kwa kufanya manunuzi nasi! Tunafurahi kuwa umepokea oda yako. Tunathamini uaminifu wako.',
        investigation_en:
          "We're sorry you haven't received your order. We're checking your order now and will get back to you shortly.",
        investigation_sw:
          'Pole kwa kuwa bado hujapokea oda yako. Tunaifuatilia oda yako sasa na tutakujulisha hivi karibuni.',
      },
    });
  }

  return settings;
}

export async function updateReceiptConfirmationSettings(data: {
  auto_confirm_enabled?: boolean;
  send_delay_seconds?: number;
  reminder_enabled?: boolean;
  reminder_delay_hours?: number;
  max_reminders?: number;
  template_en?: string;
  template_sw?: string;
  thank_you_en?: string;
  thank_you_sw?: string;
  investigation_en?: string;
  investigation_sw?: string;
}) {
  await getReceiptConfirmationSettings(); // ensure exists
  return (prisma as any).receiptConfirmationSetting.update({
    where: { id: 'default' },
    data,
  });
}

/**
 * Triggers automated order receipt confirmation when an order reaches DELIVERED.
 * Idempotent: Only sends once unless deliberately resent.
 */
export async function triggerOrderReceiptConfirmation(
  orderId: string,
  options?: { isResend?: boolean; triggeredBy?: string }
): Promise<any> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      merchant: true,
      receipt_confirmation: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Must only trigger for DELIVERED status
  if (order.status !== 'DELIVERED') {
    console.log(`[RECEIPT CONFIRMATION] Skipping order ${order.order_number}: status is ${order.status}, not DELIVERED.`);
    return null;
  }

  const settings = await getReceiptConfirmationSettings();

  if (!options?.isResend && !settings.auto_confirm_enabled) {
    console.log(`[RECEIPT CONFIRMATION] Automated confirmation is toggled OFF in settings.`);
    return null;
  }

  // Check if confirmation record already exists
  let confirmation = order.receipt_confirmation;

  if (confirmation && confirmation.customer_response && !options?.isResend) {
    console.log(`[RECEIPT CONFIRMATION] Order ${order.order_number} already responded with ${confirmation.customer_response}.`);
    return confirmation;
  }

  if (confirmation && confirmation.customer_response && options?.isResend) {
    throw new Error('Cannot resend receipt confirmation: Customer has already recorded a response.');
  }

  // Determine token
  let token = confirmation?.confirmation_token;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
  }

  const confirmationLink = `${config.frontendUrl}/confirm/${token}`;

  // Determine language (from merchant user / created event or phone)
  let language: Language = 'sw'; // Default to Kiswahili for local context or English
  try {
    const created = await prisma.orderEvent.findFirst({
      where: { order_id: orderId, event_type: 'ORDER_CREATED' },
      select: { actor_reference: true },
      orderBy: { timestamp: 'asc' },
    });
    if (created?.actor_reference) {
      const user = await prisma.merchantUser.findUnique({
        where: { id: created.actor_reference },
        select: { language: true },
      });
      if (user?.language === 'en') language = 'en';
    }
  } catch {}

  // Format SMS body
  const template =
    language === 'sw'
      ? settings.template_sw || 'Habari {{customerName}}, umepokea oda yako #{{orderNumber}}? Tafadhali thibitisha hapa: {{confirmationLink}}'
      : settings.template_en || 'Hello {{customerName}}, have you received your order #{{orderNumber}}? Please confirm here: {{confirmationLink}}';

  const messageBody = template
    .replace(/\{\{customerName\}\}/g, order.customer_name || 'Customer')
    .replace(/\{\{orderNumber\}\}/g, order.order_number)
    .replace(/\{\{confirmationLink\}\}/g, confirmationLink);

  // Upsert or create confirmation record in database
  if (!confirmation) {
    confirmation = await (prisma as any).orderReceiptConfirmation.create({
      data: {
        order_id: order.id,
        merchant_id: order.merchant_id,
        confirmation_token: token,
        sms_status: 'QUEUED',
        sms_type: options?.isResend ? 'RESENT' : 'AUTOMATIC',
      },
    });

    // Also link token on order
    await prisma.order.update({
      where: { id: order.id },
      data: {
        receipt_confirmation_token: token,
        receipt_status: 'AWAITING_RESPONSE',
      },
    });
  } else if (options?.isResend) {
    confirmation = await (prisma as any).orderReceiptConfirmation.update({
      where: { id: confirmation.id },
      data: {
        sms_status: 'QUEUED',
        sms_type: 'RESENT',
      },
    });
  }

  // Record in OrderNotification for Bulk SMS & notification history tracking
  const idempotencyKey = `RECEIPT_CONFIRMATION:${order.id}:${options?.isResend ? Date.now() : 'AUTO'}`;
  const notif = await prisma.orderNotification.create({
    data: {
      order_id: order.id,
      event_type: options?.isResend ? 'RECEIPT_CONFIRMATION_RESENT' : 'RECEIPT_CONFIRMATION_REQUEST',
      recipient_type: 'CUSTOMER',
      recipient_phone: order.customer_phone,
      message_body: messageBody,
      idempotency_key: idempotencyKey,
      channel: 'SMS',
      status: 'QUEUED',
    },
  });

  const confirmationId = (confirmation as any).id;

  // Dispatch SMS asynchronously
  setImmediate(async () => {
    try {
      const delayMs = (settings.send_delay_seconds || 0) * 1000;
      if (delayMs > 0 && !options?.isResend) {
        await new Promise((r) => setTimeout(r, delayMs));
      }

      console.log(`[RECEIPT CONFIRMATION SMS] Dispatching to ${order.customer_phone} for order #${order.order_number}...`);
      const result = await smsAdapter.sendSMS(order.customer_phone, messageBody);

      if (result.success) {
        const now = new Date();
        await (prisma as any).orderReceiptConfirmation.update({
          where: { id: confirmationId },
          data: {
            sms_status: 'SENT',
            sms_sent_at: now,
            sms_message_id: result.messageId,
          },
        });

        await prisma.orderNotification.update({
          where: { id: notif.id },
          data: {
            status: 'SENT',
            provider_message_id: result.messageId,
            sent_at: now,
            delivered_at: now,
          },
        });
      } else {
        await (prisma as any).orderReceiptConfirmation.update({
          where: { id: confirmationId },
          data: {
            sms_status: 'FAILED',
            sms_failure_reason: result.error || 'Provider rejected request',
          },
        });

        await prisma.orderNotification.update({
          where: { id: notif.id },
          data: {
            status: 'FAILED',
            failed_at: new Date(),
            failure_reason: result.error || 'Provider rejected request',
          },
        });
      }
    } catch (err: any) {
      console.error('[RECEIPT CONFIRMATION DISPATCH ERROR]', err);
      await (prisma as any).orderReceiptConfirmation.update({
        where: { id: confirmationId },
        data: {
          sms_status: 'FAILED',
          sms_failure_reason: err.message || 'Unknown network dispatch error',
        },
      });
    }
  });

  return confirmation;
}

/**
 * Public: Get order info for receipt confirmation page by confirmation_token.
 * Does not expose sensitive customer information.
 */
export async function getPublicConfirmationInfo(token: string) {
  if (!token) {
    throw new Error('Confirmation token is required');
  }

  const confirmation = await (prisma as any).orderReceiptConfirmation.findUnique({
    where: { confirmation_token: token },
    include: {
      order: {
        select: {
          id: true,
          order_number: true,
          customer_name: true,
          product_name: true,
          amount: true,
          total_revenue: true,
          delivered_at: true,
          status: true,
          items: {
            select: {
              product_name_snapshot: true,
              quantity: true,
              unit_selling_price: true,
              subtotal: true,
            },
          },
        },
      },
      merchant: {
        select: {
          id: true,
          business_name: true,
          logo_url: true,
          brand_color: true,
          business_phone: true,
        },
      },
    },
  });

  if (!confirmation || !confirmation.order) {
    return null;
  }

  const order = confirmation.order;
  const merchant = confirmation.merchant;

  // Mask customer name for privacy (e.g. John D.)
  const nameParts = (order.customer_name || 'Customer').trim().split(/\s+/);
  const maskedName =
    nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
      : nameParts[0];

  return {
    confirmation_id: confirmation.id,
    order_id: order.id,
    order_number: order.order_number,
    masked_customer_name: maskedName,
    product_name: order.product_name,
    amount: order.total_revenue || order.amount,
    delivered_at: order.delivered_at,
    order_status: order.status,
    items: order.items,
    merchant: {
      name: merchant?.business_name || 'LUMO Partner Merchant',
      logo: merchant?.logo_url || null,
      brand_color: merchant?.brand_color || '#1E40AF',
      phone: merchant?.business_phone || null,
    },
    is_already_confirmed: !!confirmation.customer_response,
    customer_response: confirmation.customer_response, // 'RECEIVED' | 'NOT_RECEIVED' | null
    responded_at: confirmation.responded_at,
    followup_status: confirmation.followup_status,
  };
}

/**
 * Public: Customer submits YES or NO to "Have you received your order?"
 * Enforces transaction, idempotency, sends thank-you or investigation message,
 * and notifies both Admin and Merchant teams.
 */
export async function submitCustomerConfirmation(params: {
  token: string;
  response: 'YES' | 'NO' | 'RECEIVED' | 'NOT_RECEIVED';
  ipAddress?: string;
  userAgent?: string;
}) {
  const { token, ipAddress, userAgent } = params;

  // Normalize response
  const isYes = params.response === 'YES' || params.response === 'RECEIVED';
  const customerResponse = isYes ? 'RECEIVED' : 'NOT_RECEIVED';

  // Atomic database transaction
  const result = await prisma.$transaction(async (tx: any) => {
    const confirmation = await tx.orderReceiptConfirmation.findUnique({
      where: { confirmation_token: token },
      include: {
        order: {
          include: {
            merchant: true,
          },
        },
      },
    });

    if (!confirmation || !confirmation.order) {
      throw new Error('INVALID_TOKEN');
    }

    // Idempotency check: prevent duplicate submissions
    if (confirmation.customer_response) {
      const err: any = new Error('ALREADY_SUBMITTED');
      err.code = 'ALREADY_SUBMITTED';
      err.existingResponse = confirmation.customer_response;
      err.respondedAt = confirmation.responded_at;
      throw err;
    }

    const now = new Date();

    // Prepare follow-up case notes if NO
    let initialNotes: string | null = null;
    let followupStatus: string | null = null;

    if (!isYes) {
      followupStatus = 'OPEN';
      const initialCaseNote: InvestigationNoteItem = {
        id: crypto.randomUUID(),
        author: 'System Workflow',
        role: 'SYSTEM',
        text: `Customer reported order #${confirmation.order.order_number} as NOT received via receipt confirmation portal. Delivery follow-up case initiated.`,
        created_at: now.toISOString(),
      };
      initialNotes = JSON.stringify([initialCaseNote]);
    }

    // Update receipt confirmation record
    const updatedConfirmation = await tx.orderReceiptConfirmation.update({
      where: { id: confirmation.id },
      data: {
        customer_response: customerResponse,
        responded_at: now,
        response_channel: 'WEB',
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        followup_status: followupStatus,
        investigation_notes: initialNotes,
      },
    });

    // Update Order's receipt_status
    await tx.order.update({
      where: { id: confirmation.order.id },
      data: {
        receipt_status: customerResponse,
      },
    });

    // Create OrderEvent audit trail
    await tx.orderEvent.create({
      data: {
        order_id: confirmation.order.id,
        event_type: isYes ? 'ORDER_RECEIPT_CONFIRMED' : 'ORDER_RECEIPT_NOT_RECEIVED',
        actor_type: 'CUSTOMER',
        actor_reference: confirmation.order.customer_phone,
        metadata: JSON.stringify({
          response: customerResponse,
          ip: ipAddress,
          timestamp: now.toISOString(),
        }),
      },
    });

    // Log in AuditLog
    await tx.auditLog.create({
      data: {
        merchant_id: confirmation.merchant_id,
        action: isYes ? 'RECEIPT_CONFIRMED' : 'RECEIPT_NOT_RECEIVED',
        object_type: 'ORDER_RECEIPT_CONFIRMATION',
        object_id: confirmation.id,
        metadata: JSON.stringify({
          order_number: confirmation.order.order_number,
          response: customerResponse,
          customer_phone: confirmation.order.customer_phone,
        }),
      },
    });

    return {
      confirmation: updatedConfirmation,
      order: confirmation.order,
      merchant: confirmation.order.merchant,
    };
  });

  const { order, merchant } = result;

  // Determine customer language
  let language: Language = 'sw';
  try {
    const created = await prisma.orderEvent.findFirst({
      where: { order_id: order.id, event_type: 'ORDER_CREATED' },
      select: { actor_reference: true },
      orderBy: { timestamp: 'asc' },
    });
    if (created?.actor_reference) {
      const user = await prisma.merchantUser.findUnique({
        where: { id: created.actor_reference },
        select: { language: true },
      });
      if (user?.language === 'en') language = 'en';
    }
  } catch {}

  const settings = await getReceiptConfirmationSettings();

  // Async notifications and customer SMS dispatch
  setImmediate(async () => {
    try {
      if (isYes) {
        // --- 1. Send Customer Thank-You SMS ---
        const thankYouMessage =
          language === 'sw'
            ? settings.thank_you_sw ||
              'Asante kwa kufanya manunuzi nasi! Tunafurahi kuwa umepokea oda yako. Tunathamini uaminifu wako.'
            : settings.thank_you_en ||
              "Thank you for shopping with us! We're glad you received your order. We appreciate your support.";

        const thankYouNotif = await prisma.orderNotification.create({
          data: {
            order_id: order.id,
            event_type: 'RECEIPT_CONFIRMATION_THANK_YOU',
            recipient_type: 'CUSTOMER',
            recipient_phone: order.customer_phone,
            message_body: thankYouMessage,
            idempotency_key: `THANK_YOU:${order.id}`,
            channel: 'SMS',
            status: 'QUEUED',
          },
        });

        const smsRes = await smsAdapter.sendSMS(order.customer_phone, thankYouMessage);
        await prisma.orderNotification.update({
          where: { id: thankYouNotif.id },
          data: {
            status: smsRes.success ? 'SENT' : 'FAILED',
            provider_message_id: smsRes.messageId || null,
            failure_reason: smsRes.error || null,
            sent_at: smsRes.success ? new Date() : null,
          },
        });

        // --- 2. Notify Admin and Merchant ---
        // Record internal dashboard notification for Admin & Merchant
        const internalAdminMsg = `Order #${order.order_number}: Customer confirmed receipt of the order.`;
        console.log(`[RECEIPT NOTIFICATION -> ADMIN]: ${internalAdminMsg}`);

        await prisma.orderNotification.create({
          data: {
            order_id: order.id,
            event_type: 'RECEIPT_CONFIRMED_INTERNAL_ALERT',
            recipient_type: 'ADMIN',
            recipient_phone: 'ADMIN_DASHBOARD',
            message_body: internalAdminMsg,
            idempotency_key: `ALERT_ADMIN_CONFIRMED:${order.id}`,
            channel: 'DASHBOARD',
            status: 'DELIVERED',
            sent_at: new Date(),
          },
        });

        if (merchant?.business_phone) {
          const merchantMsg = `Order #${order.order_number}: Customer confirmed receipt of the order.`;
          await prisma.orderNotification.create({
            data: {
              order_id: order.id,
              event_type: 'RECEIPT_CONFIRMED_MERCHANT_ALERT',
              recipient_type: 'MERCHANT',
              recipient_phone: merchant.business_phone,
              message_body: merchantMsg,
              idempotency_key: `ALERT_MERCHANT_CONFIRMED:${order.id}`,
              channel: 'DASHBOARD',
              status: 'DELIVERED',
              sent_at: new Date(),
            },
          });
        }
      } else {
        // --- 1. Customer reported NOT received ---
        const investigationMsg =
          language === 'sw'
            ? settings.investigation_sw ||
              'Pole kwa kuwa bado hujapokea oda yako. Tunaifuatilia oda yako sasa na tutakujulisha hivi karibuni.'
            : settings.investigation_en ||
              "We're sorry you haven't received your order. We're checking your order now and will get back to you shortly.";

        const investigationNotif = await prisma.orderNotification.create({
          data: {
            order_id: order.id,
            event_type: 'RECEIPT_CONFIRMATION_INVESTIGATION',
            recipient_type: 'CUSTOMER',
            recipient_phone: order.customer_phone,
            message_body: investigationMsg,
            idempotency_key: `INVESTIGATION_SMS:${order.id}`,
            channel: 'SMS',
            status: 'QUEUED',
          },
        });

        const smsRes = await smsAdapter.sendSMS(order.customer_phone, investigationMsg);
        await prisma.orderNotification.update({
          where: { id: investigationNotif.id },
          data: {
            status: smsRes.success ? 'SENT' : 'FAILED',
            provider_message_id: smsRes.messageId || null,
            failure_reason: smsRes.error || null,
            sent_at: smsRes.success ? new Date() : null,
          },
        });

        // --- 2. URGENT follow-up notification to Admin and Merchant ---
        const urgentAlert = `URGENT FOLLOW-UP: Customer reports not receiving order #${order.order_number}. Please investigate the delivery and contact the customer.`;
        console.log(`[URGENT FOLLOW-UP NOTIFICATION]: ${urgentAlert}`);

        // Admin notification
        await prisma.orderNotification.create({
          data: {
            order_id: order.id,
            event_type: 'RECEIPT_NOT_RECEIVED_URGENT_ADMIN',
            recipient_type: 'ADMIN',
            recipient_phone: 'ADMIN_DASHBOARD',
            message_body: urgentAlert,
            idempotency_key: `ALERT_ADMIN_NOT_RECEIVED:${order.id}`,
            channel: 'DASHBOARD',
            status: 'DELIVERED',
            sent_at: new Date(),
          },
        });

        // Create SystemIncident so it also alerts the monitoring system
        try {
          await (prisma as any).systemIncident.create({
            data: {
              service_name: 'DELIVERY_CONFIRMATION',
              error_type: 'CUSTOMER_NOT_RECEIVED',
              severity: 'WARNING',
              description: urgentAlert,
              merchant_id: order.merchant_id,
              order_id: order.id,
              status: 'OPEN',
              metadata: JSON.stringify({
                order_number: order.order_number,
                customer_phone: order.customer_phone,
                customer_name: order.customer_name,
                delivery_address: order.delivery_address,
                driver_name: order.driver_name,
              }),
            },
          });
        } catch {}

        // Merchant notification
        if (merchant?.business_phone) {
          await prisma.orderNotification.create({
            data: {
              order_id: order.id,
              event_type: 'RECEIPT_NOT_RECEIVED_URGENT_MERCHANT',
              recipient_type: 'MERCHANT',
              recipient_phone: merchant.business_phone,
              message_body: urgentAlert,
              idempotency_key: `ALERT_MERCHANT_NOT_RECEIVED:${order.id}`,
              channel: 'DASHBOARD',
              status: 'DELIVERED',
              sent_at: new Date(),
            },
          });

          // Also deliver via SMS to Merchant business phone if configured
          try {
            await smsAdapter.sendSMS(merchant.business_phone, urgentAlert);
          } catch {}
        }
      }
    } catch (err) {
      console.error('[RECEIPT CONFIRMATION POST-SUBMISSION NOTIFICATION ERROR]', err);
    }
  });

  return {
    success: true,
    response: customerResponse,
    responded_at: result.confirmation.responded_at,
    order_number: order.order_number,
  };
}

/**
 * Staff Operational Workflow: Add investigation note to follow-up case
 */
export async function addFollowupNote(params: {
  confirmationId: string;
  author: string;
  role: string;
  text: string;
  merchantId?: string | null;
}) {
  const { confirmationId, author, role, text, merchantId } = params;

  const where: any = { id: confirmationId };
  if (merchantId) where.merchant_id = merchantId;

  const confirmation = await (prisma as any).orderReceiptConfirmation.findFirst({
    where,
    include: { order: true },
  });

  if (!confirmation) {
    throw new Error('Receipt confirmation record not found or unauthorized');
  }

  let notes: InvestigationNoteItem[] = [];
  try {
    if (confirmation.investigation_notes) {
      notes = JSON.parse(confirmation.investigation_notes);
    }
  } catch {
    notes = [];
  }

  const newNote: InvestigationNoteItem = {
    id: crypto.randomUUID(),
    author,
    role,
    text: text.trim(),
    created_at: new Date().toISOString(),
  };

  notes.push(newNote);

  return (prisma as any).orderReceiptConfirmation.update({
    where: { id: confirmation.id },
    data: {
      investigation_notes: JSON.stringify(notes),
    },
  });
}

/**
 * Staff Operational Workflow: Update follow-up case status & resolution notes
 * Supported statuses: OPEN, INVESTIGATING, RESOLVED, CLOSED
 */
export async function updateFollowupCase(params: {
  confirmationId: string;
  status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  assigned_staff?: string;
  resolution_notes?: string;
  customer_message?: string;
  authorName: string;
  authorRole: string;
  merchantId?: string | null;
}) {
  const {
    confirmationId,
    status,
    assigned_staff,
    resolution_notes,
    customer_message,
    authorName,
    authorRole,
    merchantId,
  } = params;

  const where: any = { id: confirmationId };
  if (merchantId) where.merchant_id = merchantId;

  const confirmation = await (prisma as any).orderReceiptConfirmation.findFirst({
    where,
    include: { order: true },
  });

  if (!confirmation) {
    throw new Error('Receipt confirmation record not found or unauthorized');
  }

  const updateData: any = {};
  if (status) {
    updateData.followup_status = status;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolved_at = new Date();
    }
  }

  if (assigned_staff !== undefined) {
    updateData.assigned_staff = assigned_staff;
  }

  if (resolution_notes !== undefined) {
    updateData.resolution_notes = resolution_notes;
  }

  // Append history note
  let notes: InvestigationNoteItem[] = [];
  try {
    if (confirmation.investigation_notes) {
      notes = JSON.parse(confirmation.investigation_notes);
    }
  } catch {
    notes = [];
  }

  const changes: string[] = [];
  if (status && status !== confirmation.followup_status) {
    changes.push(`status updated to ${status}`);
  }
  if (assigned_staff && assigned_staff !== confirmation.assigned_staff) {
    changes.push(`assigned to ${assigned_staff}`);
  }
  if (resolution_notes) {
    changes.push(`resolution recorded: "${resolution_notes}"`);
  }

  if (changes.length > 0) {
    notes.push({
      id: crypto.randomUUID(),
      author: authorName,
      role: authorRole,
      text: changes.join(', '),
      created_at: new Date().toISOString(),
    });
  }

  updateData.investigation_notes = JSON.stringify(notes);

  const updated = await (prisma as any).orderReceiptConfirmation.update({
    where: { id: confirmation.id },
    data: updateData,
  });

  // If staff chose to send a customer follow-up message
  if (customer_message && customer_message.trim()) {
    const msg = customer_message.trim();
    setImmediate(async () => {
      try {
        console.log(`[STAFF FOLLOW-UP SMS] Sending to ${confirmation.order.customer_phone}: "${msg}"`);
        const smsRes = await smsAdapter.sendSMS(confirmation.order.customer_phone, msg);

        await prisma.orderNotification.create({
          data: {
            order_id: confirmation.order.id,
            event_type: 'STAFF_FOLLOWUP_SMS',
            recipient_type: 'CUSTOMER',
            recipient_phone: confirmation.order.customer_phone,
            message_body: msg,
            idempotency_key: `STAFF_MSG:${confirmation.id}:${Date.now()}`,
            channel: 'SMS',
            status: smsRes.success ? 'SENT' : 'FAILED',
            provider_message_id: smsRes.messageId || null,
            failure_reason: smsRes.error || null,
            sent_at: smsRes.success ? new Date() : null,
          },
        });
      } catch (err) {
        console.error('[STAFF FOLLOW-UP SMS ERROR]', err);
      }
    });
  }

  return updated;
}

/**
 * List receipt confirmations with search and filters.
 * Scoped by merchantId for merchant dashboard; un-scoped for admin.
 */
export async function listReceiptConfirmations(options: {
  merchantId?: string | null;
  search?: string;
  customerResponse?: string;
  followupStatus?: string;
  smsStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 25));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options.merchantId) {
    where.merchant_id = options.merchantId;
  }

  if (options.customerResponse && options.customerResponse !== 'ALL') {
    if (options.customerResponse === 'AWAITING') {
      where.customer_response = null;
    } else {
      where.customer_response = options.customerResponse;
    }
  }

  if (options.followupStatus && options.followupStatus !== 'ALL') {
    where.followup_status = options.followupStatus;
  }

  if (options.smsStatus && options.smsStatus !== 'ALL') {
    where.sms_status = options.smsStatus;
  }

  if (options.startDate || options.endDate) {
    where.created_at = {};
    if (options.startDate) {
      where.created_at.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at.lte = end;
    }
  }

  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.OR = [
      { order: { order_number: { contains: s, mode: 'insensitive' } } },
      { order: { customer_name: { contains: s, mode: 'insensitive' } } },
      { order: { customer_phone: { contains: s } } },
      { order: { product_name: { contains: s, mode: 'insensitive' } } },
      { merchant: { business_name: { contains: s, mode: 'insensitive' } } },
      { assigned_staff: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [total, confirmations] = await Promise.all([
    (prisma as any).orderReceiptConfirmation.count({ where }),
    (prisma as any).orderReceiptConfirmation.findMany({
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
            delivery_address: true,
            product_name: true,
            amount: true,
            total_revenue: true,
            status: true,
            delivered_at: true,
            created_at: true,
            driver_name: true,
            driver_phone: true,
          },
        },
        merchant: {
          select: {
            id: true,
            business_name: true,
            business_phone: true,
            logo_url: true,
          },
        },
      },
    }),
  ]);

  return {
    confirmations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Returns summary KPIs for receipt confirmations.
 */
export async function getReceiptConfirmationKPIs(merchantId?: string | null) {
  const baseWhere: any = {};
  if (merchantId) baseWhere.merchant_id = merchantId;

  const [
    total_eligible_orders,
    confirmation_sms_sent,
    confirmed_received,
    reported_not_received,
    awaiting_response,
    open_followup_cases,
    resolved_cases,
  ] = await Promise.all([
    // Total delivered orders
    prisma.order.count({
      where: {
        ...(merchantId ? { merchant_id: merchantId } : {}),
        status: 'DELIVERED',
      },
    }),
    // Confirmation SMS sent
    (prisma as any).orderReceiptConfirmation.count({
      where: {
        ...baseWhere,
        sms_status: { in: ['SENT', 'DELIVERED'] },
      },
    }),
    // Customers confirmed received
    (prisma as any).orderReceiptConfirmation.count({
      where: {
        ...baseWhere,
        customer_response: 'RECEIVED',
      },
    }),
    // Customers reported non-receipt
    (prisma as any).orderReceiptConfirmation.count({
      where: {
        ...baseWhere,
        customer_response: 'NOT_RECEIVED',
      },
    }),
    // Awaiting response
    (prisma as any).orderReceiptConfirmation.count({
      where: {
        ...baseWhere,
        customer_response: null,
      },
    }),
    // Open follow-up cases
    (prisma as any).orderReceiptConfirmation.count({
      where: {
        ...baseWhere,
        followup_status: { in: ['OPEN', 'INVESTIGATING'] },
      },
    }),
    // Resolved follow-up cases
    (prisma as any).orderReceiptConfirmation.count({
      where: {
        ...baseWhere,
        followup_status: { in: ['RESOLVED', 'CLOSED'] },
      },
    }),
  ]);

  return {
    total_eligible_orders,
    confirmation_sms_sent,
    confirmed_received,
    reported_not_received,
    awaiting_response,
    open_followup_cases,
    resolved_cases,
  };
}

/**
 * Process provider delivery callback (webhook) for SMS delivery receipts.
 */
export async function handleSmsDeliveryWebhook(data: {
  messageId: string;
  status: 'DELIVERED' | 'FAILED';
  deliveredAt?: Date;
  failureReason?: string;
}) {
  const { messageId, status, deliveredAt, failureReason } = data;

  // Update order notifications
  await prisma.orderNotification.updateMany({
    where: { provider_message_id: messageId },
    data: {
      status,
      delivered_at: status === 'DELIVERED' ? deliveredAt || new Date() : undefined,
      failed_at: status === 'FAILED' ? new Date() : undefined,
      failure_reason: failureReason || null,
    },
  });

  // Update order receipt confirmation if matched
  await (prisma as any).orderReceiptConfirmation.updateMany({
    where: { sms_message_id: messageId },
    data: {
      sms_status: status,
      sms_delivered_at: status === 'DELIVERED' ? deliveredAt || new Date() : undefined,
      sms_failure_reason: failureReason || null,
    },
  });

  return { success: true };
}
