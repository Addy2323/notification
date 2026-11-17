import { prisma } from '../database/prisma';
import { smsManagementService } from './smsManagementService';
import { MesejiSMSAdapter, normalizePhone } from '../notifications/adapter';
import { getPublicStoreUrl } from './storeService';

const pAny = prisma as any;
const smsAdapter = new MesejiSMSAdapter();

let defaultTemplatesSeeded = false;

const DEFAULT_PROMO_TEMPLATES = [
  {
    name: 'New Arrivals',
    promotion_type: 'NEW_ARRIVALS',
    body: 'Hello [Customer Name]! Discover our latest arrivals at [Merchant Name]. Visit our store today to explore exciting new products. [Store Link]',
  },
  {
    name: 'Christmas Offers',
    promotion_type: 'CHRISTMAS_OFFERS',
    body: 'Happy Christmas from [Merchant Name]! Enjoy exciting Christmas offers and discounts. Explore our products today: [Store Link]',
  },
  {
    name: 'Discount Offers',
    promotion_type: 'DISCOUNT_OFFERS',
    body: 'Special offer from [Merchant Name]! Enjoy [Discount] on selected products. Offer ends [Expiration Date]. Shop now: [Store Link]',
  },
  {
    name: 'New Product',
    promotion_type: 'PRODUCT_LAUNCH',
    body: "Exciting news! [Merchant Name] has introduced new products. Discover what's new here: [Store Link]",
  },
  {
    name: 'General Promotion',
    promotion_type: 'GENERAL_ANNOUNCEMENT',
    body: "Hello [Customer Name]! We have something special for you at [Merchant Name]. Visit our store and explore today's offers: [Store Link]",
  },
];

export async function ensureDefaultSmsTemplates() {
  if (defaultTemplatesSeeded || !pAny.smsTemplate?.count) return;
  const count = await pAny.smsTemplate.count({ where: { is_system: true } });
  if (count > 0) {
    defaultTemplatesSeeded = true;
    return;
  }
  await pAny.smsTemplate.createMany({
    data: DEFAULT_PROMO_TEMPLATES.map((t) => ({
      ...t,
      merchant_id: null,
      is_system: true,
    })),
  });
  defaultTemplatesSeeded = true;
}

export function maskPhoneNumber(phone: string): string {
  const clean = (phone || '').trim();
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)}****${clean.slice(-2)}`;
}

export function isValidSmsPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export function computeSmsUnits(message: string): number {
  const len = (message || '').length;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

export function renderPromotionMessage(
  template: string,
  vars: {
    customerName: string;
    merchantName: string;
    storeName: string;
    promotionName?: string;
    discount?: string;
    expirationDate?: string;
    storeLink: string;
  }
): string {
  return String(template || '')
    .replace(/\[Customer Name\]/gi, vars.customerName || 'Customer')
    .replace(/\[Merchant Name\]/gi, vars.merchantName || 'LUMO Merchant')
    .replace(/\[Business Name\]/gi, vars.merchantName || 'LUMO Merchant')
    .replace(/\[Store Name\]/gi, vars.storeName || vars.merchantName || 'Our Store')
    .replace(/\[Promotion Name\]/gi, vars.promotionName || 'Special Promotion')
    .replace(/\[Discount\]/gi, vars.discount || 'Special Discount')
    .replace(/\[Expiry Date\]/gi, vars.expirationDate || 'Soon')
    .replace(/\[Expiration Date\]/gi, vars.expirationDate || 'Soon')
    .replace(/\[Store Link\]/gi, vars.storeLink || '')
    .trim();
}

export async function getMerchantPromotionsOverview(merchantId: string) {
  await ensureDefaultSmsTemplates();

  const [campaigns, smsOverview] = await Promise.all([
    pAny.smsCampaign.findMany({
      where: { merchant_id: merchantId },
      orderBy: { created_at: 'desc' },
      take: 50,
    }),
    smsManagementService.getMerchantOverview(merchantId),
  ]);

  const totalCampaigns = campaigns.length;
  const totalMessagesSent = campaigns.reduce((sum: number, c: any) => sum + Number(c.sent_count || 0), 0);
  const successfulDeliveries = totalMessagesSent;
  const failedDeliveries = campaigns.reduce((sum: number, c: any) => sum + Number(c.failed_count || 0), 0);
  const availableCredits = Number(smsOverview?.account?.availableCredits || 0);
  const unitPriceTzs = Number(smsOverview?.pricing?.unitPriceTzs || 20);

  return {
    stats: {
      totalCampaigns,
      totalMessagesSent,
      successfulDeliveries,
      failedDeliveries,
      availableCredits,
      unitPriceTzs,
    },
    campaigns,
  };
}

export async function listMerchantTemplates(merchantId: string) {
  await ensureDefaultSmsTemplates();
  return pAny.smsTemplate.findMany({
    where: {
      OR: [{ is_system: true }, { merchant_id: merchantId }],
    },
    orderBy: [{ is_system: 'desc' }, { created_at: 'desc' }],
  });
}

export async function saveMerchantTemplate(
  merchantId: string,
  input: { name: string; promotionType?: string; body: string }
) {
  if (!input.name?.trim() || !input.body?.trim()) {
    throw new Error('Template name and message body are required');
  }
  return pAny.smsTemplate.create({
    data: {
      merchant_id: merchantId,
      name: input.name.trim(),
      promotion_type: input.promotionType || 'CUSTOM_PROMOTION',
      body: input.body.trim(),
      is_system: false,
    },
  });
}

export async function deleteMerchantTemplate(merchantId: string, templateId: string) {
  const existing = await pAny.smsTemplate.findFirst({
    where: { id: templateId, merchant_id: merchantId, is_system: false },
  });
  if (!existing) throw new Error('Template not found or cannot delete system template');
  await pAny.smsTemplate.delete({ where: { id: templateId } });
  return { deleted: true, id: templateId };
}

export async function listMerchantTargetCustomers(
  merchantId: string,
  filters: { q?: string; filter?: 'ALL' | 'ELIGIBLE' | 'OPTED_IN' }
) {
  const where: any = { merchant_id: merchantId };
  if (filters.q?.trim()) {
    where.OR = [
      { name: { contains: filters.q.trim(), mode: 'insensitive' } },
      { phone: { contains: filters.q.trim(), mode: 'insensitive' } },
    ];
  }
  if (filters.filter === 'OPTED_IN' || filters.filter === 'ELIGIBLE') {
    where.marketing_opt_in = true;
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ created_at: 'desc' }],
    take: 500,
    select: {
      id: true,
      name: true,
      phone: true,
      marketing_opt_in: true,
      created_at: true,
      _count: {
        select: { orders: true },
      },
    },
  });

  const mapped = customers.map((c: any) => {
    const validPhone = isValidSmsPhone(c.phone);
    const eligible = validPhone && c.marketing_opt_in !== false;
    return {
      id: c.id,
      name: c.name,
      maskedPhone: maskPhoneNumber(c.phone),
      totalOrders: c._count?.orders || 0,
      lastOrderAt: c.created_at,
      marketingOptIn: c.marketing_opt_in,
      eligible,
    };
  });

  return {
    customers: mapped,
    totalCount: mapped.length,
    totalEligible: mapped.filter((c) => c.eligible).length,
  };
}

async function resolveVerifiedMerchantRecipients(
  merchantId: string,
  customerIds: string[]
) {
  const uniqueIds = Array.from(new Set((customerIds || []).filter(Boolean)));
  if (uniqueIds.length === 0) {
    throw new Error('Select at least one customer recipient');
  }

  const ownedCustomers = await prisma.customer.findMany({
    where: {
      id: { in: uniqueIds },
      merchant_id: merchantId,
    },
  });

  if (ownedCustomers.length !== uniqueIds.length) {
    throw new Error('One or more selected recipients do not belong to your merchant account');
  }

  const eligible = ownedCustomers.filter(
    (c) => isValidSmsPhone(c.phone) && c.marketing_opt_in !== false
  );

  if (eligible.length === 0) {
    throw new Error('No eligible customers with valid phone numbers and messaging permission selected');
  }

  return eligible;
}

export async function previewSmsCampaign(
  merchantId: string,
  input: {
    name: string;
    promotionType: string;
    messageBody: string;
    customerIds: string[];
    discount?: string;
    expirationDate?: string;
  }
) {
  if (!input.messageBody?.trim()) {
    throw new Error('Message content cannot be empty');
  }

  const [merchant, store, eligibleCustomers, smsOverview] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: merchantId } }),
    pAny.merchantStore?.findUnique?.({ where: { merchant_id: merchantId } }),
    resolveVerifiedMerchantRecipients(merchantId, input.customerIds),
    smsManagementService.getMerchantOverview(merchantId),
  ]);

  if (!merchant) throw new Error('Merchant not found');

  const storeLink = store?.slug ? getPublicStoreUrl(store.slug) : 'https://lumotrack.lumo.co.tz';
  const sampleCustomer = eligibleCustomers[0];
  const sampleRendered = renderPromotionMessage(input.messageBody, {
    customerName: sampleCustomer.name,
    merchantName: merchant.business_name,
    storeName: store?.store_name || merchant.business_name,
    promotionName: input.name,
    discount: input.discount,
    expirationDate: input.expirationDate,
    storeLink,
  });

  let estimatedUnits = 0;
  for (const cust of eligibleCustomers) {
    const rendered = renderPromotionMessage(input.messageBody, {
      customerName: cust.name,
      merchantName: merchant.business_name,
      storeName: store?.store_name || merchant.business_name,
      promotionName: input.name,
      discount: input.discount,
      expirationDate: input.expirationDate,
      storeLink,
    });
    estimatedUnits += computeSmsUnits(rendered);
  }

  const unitPriceTzs = Number(smsOverview?.pricing?.unitPriceTzs || 20);
  const availableCredits = Number(smsOverview?.account?.availableCredits || 0);
  const estimatedCostTzs = estimatedUnits * unitPriceTzs;

  return {
    campaignName: input.name?.trim() || 'Promotional Campaign',
    promotionType: input.promotionType || 'GENERAL_ANNOUNCEMENT',
    sampleMessage: sampleRendered,
    totalSelected: input.customerIds.length,
    totalEligibleRecipients: eligibleCustomers.length,
    estimatedUnits,
    unitPriceTzs,
    estimatedCostTzs,
    availableCredits,
    hasSufficientCredits: availableCredits >= estimatedUnits,
  };
}

async function processCampaignBatchAsync(campaignId: string) {
  const campaign = await pAny.smsCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status === 'CANCELLED' || campaign.status === 'COMPLETED') return;

  await pAny.smsCampaign.update({
    where: { id: campaignId },
    data: { status: 'PROCESSING', started_at: campaign.started_at || new Date() },
  });

  const smsOverview = await smsManagementService.getMerchantOverview(campaign.merchant_id).catch(() => null);
  const unitPriceTzs = Number(smsOverview?.pricing?.unitPriceTzs || 20);

  const BATCH_SIZE = 10;
  let sentCount = Number(campaign.sent_count || 0);
  let failedCount = Number(campaign.failed_count || 0);
  let totalUnitsUsed = Number(campaign.total_units_used || 0);

  while (true) {
    const batch = await pAny.smsCampaignRecipient.findMany({
      where: { campaign_id: campaignId, status: 'PENDING' },
      take: BATCH_SIZE,
      orderBy: { created_at: 'asc' },
    });
    if (!batch.length) break;

    for (const rec of batch) {
      try {
        const deductRes = await smsManagementService.deductCredits({
          merchantId: campaign.merchant_id,
          messageBody: rec.rendered_message,
          reason: `Promotion Campaign: ${campaign.name}`,
          reference: `${campaignId}:${rec.customer_id}`,
        });

        if (!deductRes.allowed) {
          failedCount += 1;
          await pAny.smsCampaignRecipient.update({
            where: { id: rec.id },
            data: {
              status: 'FAILED',
              failure_reason: 'Insufficient SMS credits',
            },
          });
          continue;
        }

        const sendRes = await smsAdapter.sendSMS(normalizePhone(rec.recipient_phone), rec.rendered_message);
        if (sendRes.success) {
          sentCount += 1;
          totalUnitsUsed += Number(deductRes.units || rec.units || 1);
          await pAny.smsCampaignRecipient.update({
            where: { id: rec.id },
            data: {
              status: 'SENT',
              provider_message_id: sendRes.messageId || null,
              sent_at: new Date(),
              failure_reason: null,
            },
          });
        } else {
          // Refund deducted credits on provider failure
          await smsManagementService
            .extendMerchantCredits({
              adminId: 'SYSTEM',
              merchantId: campaign.merchant_id,
              units: deductRes.units,
              adjustmentType: 'CORRECTION_REVERSAL',
              reason: `Refund failed campaign SMS: ${campaign.name}`,
              paymentReference: `${campaignId}:${rec.customer_id}`,
            })
            .catch(() => null);

          failedCount += 1;
          await pAny.smsCampaignRecipient.update({
            where: { id: rec.id },
            data: {
              status: 'FAILED',
              failure_reason: sendRes.error || 'SMS provider dispatch failed',
            },
          });
        }
      } catch (err: any) {
        failedCount += 1;
        await pAny.smsCampaignRecipient.update({
          where: { id: rec.id },
          data: {
            status: 'FAILED',
            failure_reason: err?.message || 'Unexpected dispatch error',
          },
        });
      }
    }
  }

  let finalStatus = 'COMPLETED';
  if (sentCount === 0 && failedCount > 0) finalStatus = 'FAILED';
  else if (sentCount > 0 && failedCount > 0) finalStatus = 'PARTIALLY_DELIVERED';

  await pAny.smsCampaign.update({
    where: { id: campaignId },
    data: {
      status: finalStatus,
      sent_count: sentCount,
      failed_count: failedCount,
      total_units_used: totalUnitsUsed,
      total_cost_tzs: totalUnitsUsed * unitPriceTzs,
      completed_at: new Date(),
    },
  });
}

export async function createAndSendSmsCampaign(
  merchantId: string,
  userId: string,
  input: {
    name: string;
    promotionType: string;
    messageBody: string;
    customerIds: string[];
    discount?: string;
    expirationDate?: string;
    confirmSend: boolean;
  }
) {
  if (!input.name?.trim()) throw new Error('Campaign name is required');
  if (!input.messageBody?.trim()) throw new Error('SMS message content cannot be empty');

  const [merchant, store, eligibleCustomers, smsOverview] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: merchantId } }),
    pAny.merchantStore?.findUnique?.({ where: { merchant_id: merchantId } }),
    resolveVerifiedMerchantRecipients(merchantId, input.customerIds),
    smsManagementService.getMerchantOverview(merchantId),
  ]);

  if (!merchant) throw new Error('Merchant not found');

  const storeLink = store?.slug ? getPublicStoreUrl(store.slug) : 'https://lumotrack.lumo.co.tz';
  const unitPriceTzs = Number(smsOverview?.pricing?.unitPriceTzs || 20);
  const availableCredits = Number(smsOverview?.account?.availableCredits || 0);

  const recipientRows = eligibleCustomers.map((cust) => {
    const rendered = renderPromotionMessage(input.messageBody, {
      customerName: cust.name,
      merchantName: merchant.business_name,
      storeName: store?.store_name || merchant.business_name,
      promotionName: input.name,
      discount: input.discount,
      expirationDate: input.expirationDate,
      storeLink,
    });
    return {
      merchant_id: merchantId,
      customer_id: cust.id,
      customer_name: cust.name,
      recipient_phone: cust.phone,
      rendered_message: rendered,
      units: computeSmsUnits(rendered),
      status: 'PENDING',
    };
  });

  const estimatedUnits = recipientRows.reduce((s, r) => s + r.units, 0);
  const estimatedCostTzs = estimatedUnits * unitPriceTzs;

  if (input.confirmSend && availableCredits < estimatedUnits) {
    throw new Error(
      `Insufficient SMS credits. Required: ${estimatedUnits} units, Available: ${availableCredits} units.`
    );
  }

  const campaign = await prisma.$transaction(async (tx: any) => {
    const created = await tx.smsCampaign.create({
      data: {
        merchant_id: merchantId,
        name: input.name.trim(),
        promotion_type: input.promotionType || 'GENERAL_ANNOUNCEMENT',
        message_body: input.messageBody.trim(),
        status: input.confirmSend ? 'QUEUED' : 'DRAFT',
        total_recipients: recipientRows.length,
        estimated_units: estimatedUnits,
        estimated_cost_tzs: estimatedCostTzs,
        created_by: userId,
        confirmed_at: input.confirmSend ? new Date() : null,
      },
    });

    await tx.smsCampaignRecipient.createMany({
      data: recipientRows.map((r) => ({
        ...r,
        campaign_id: created.id,
      })),
    });

    await tx.auditLog.create({
      data: {
        merchant_id: merchantId,
        user_id: userId,
        action: input.confirmSend ? 'SMS_CAMPAIGN_CONFIRMED_AND_QUEUED' : 'SMS_CAMPAIGN_DRAFT_SAVED',
        object_type: 'SMS_CAMPAIGN',
        object_id: created.id,
        metadata: JSON.stringify({
          name: created.name,
          recipients: recipientRows.length,
          estimatedUnits,
        }),
      },
    });

    return created;
  });

  if (input.confirmSend) {
    setImmediate(() => {
      processCampaignBatchAsync(campaign.id).catch((err) => {
        console.error('[SMS CAMPAIGN PROCESS ERROR]', err);
      });
    });
  }

  return campaign;
}

export async function getMerchantCampaignDetails(merchantId: string, campaignId: string) {
  const campaign = await pAny.smsCampaign.findFirst({
    where: { id: campaignId, merchant_id: merchantId },
    include: {
      recipients: {
        orderBy: { created_at: 'asc' },
        take: 200,
      },
    },
  });
  if (!campaign) throw new Error('Campaign not found');

  return {
    ...campaign,
    recipients: (campaign.recipients || []).map((r: any) => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: r.customer_name,
      maskedPhone: maskPhoneNumber(r.recipient_phone),
      units: r.units,
      status: r.status,
      failureReason: r.failure_reason,
      sentAt: r.sent_at,
    })),
  };
}

export async function duplicateMerchantCampaign(merchantId: string, userId: string, campaignId: string) {
  const existing = await pAny.smsCampaign.findFirst({
    where: { id: campaignId, merchant_id: merchantId },
    include: { recipients: { select: { customer_id: true } } },
  });
  if (!existing) throw new Error('Campaign not found');

  const customerIds = (existing.recipients || []).map((r: any) => r.customer_id);
  return createAndSendSmsCampaign(merchantId, userId, {
    name: `${existing.name} (Copy)`,
    promotionType: existing.promotion_type,
    messageBody: existing.message_body,
    customerIds,
    confirmSend: false,
  });
}

export async function retryFailedCampaignMessages(merchantId: string, userId: string, campaignId: string) {
  const campaign = await pAny.smsCampaign.findFirst({
    where: { id: campaignId, merchant_id: merchantId },
  });
  if (!campaign) throw new Error('Campaign not found');

  const failedCount = await pAny.smsCampaignRecipient.count({
    where: { campaign_id: campaignId, status: 'FAILED' },
  });
  if (failedCount === 0) {
    throw new Error('No failed messages to retry in this campaign');
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.smsCampaignRecipient.updateMany({
      where: { campaign_id: campaignId, status: 'FAILED' },
      data: { status: 'PENDING', failure_reason: null },
    });
    await tx.smsCampaign.update({
      where: { id: campaignId },
      data: { status: 'QUEUED', failed_count: 0 },
    });
    await tx.auditLog.create({
      data: {
        merchant_id: merchantId,
        user_id: userId,
        action: 'SMS_CAMPAIGN_RETRY_QUEUED',
        object_type: 'SMS_CAMPAIGN',
        object_id: campaignId,
        metadata: JSON.stringify({ retriedCount: failedCount }),
      },
    });
  });

  setImmediate(() => {
    processCampaignBatchAsync(campaignId).catch((err) => {
      console.error('[SMS CAMPAIGN RETRY ERROR]', err);
    });
  });

  return { queuedRetryCount: failedCount };
}

export async function getAdminPromotionsOverview() {
  const [campaigns, providerSettings] = await Promise.all([
    pAny.smsCampaign.findMany({
      include: {
        merchant: {
          select: { id: true, business_name: true, is_verified: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    }),
    pAny.smsGlobalSetting?.findUnique?.({ where: { id: 'default' } }),
  ]);

  const totalCampaigns = campaigns.length;
  const totalMessages = campaigns.reduce((sum: number, c: any) => sum + Number(c.total_recipients || 0), 0);
  const totalSmsUsageUnits = campaigns.reduce((sum: number, c: any) => sum + Number(c.total_units_used || 0), 0);
  const successfulDeliveries = campaigns.reduce((sum: number, c: any) => sum + Number(c.sent_count || 0), 0);
  const failedDeliveries = campaigns.reduce((sum: number, c: any) => sum + Number(c.failed_count || 0), 0);

  return {
    stats: {
      totalCampaigns,
      totalMessages,
      totalSmsUsageUnits,
      successfulDeliveries,
      failedDeliveries,
      providerStatus: providerSettings?.provider_status || 'CONNECTED',
      providerName: providerSettings?.provider_account_name || 'Meseji SMS',
      providerBalanceUnits: providerSettings?.provider_balance_units ?? null,
    },
    campaigns: campaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      promotionType: c.promotion_type,
      status: c.status,
      totalRecipients: c.total_recipients,
      sentCount: c.sent_count,
      failedCount: c.failed_count,
      totalUnitsUsed: c.total_units_used,
      totalCostTzs: c.total_cost_tzs,
      createdAt: c.created_at,
      completedAt: c.completed_at,
      merchant: c.merchant,
    })),
  };
}
