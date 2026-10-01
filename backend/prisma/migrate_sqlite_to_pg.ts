import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Data Migration from SQLite dump to PostgreSQL ---');
  console.log('Target Database:', process.env.DATABASE_URL);

  const dumpPath = path.join(__dirname, 'sqlite_dump.json');
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Dump file not found at ${dumpPath}`);
  }

  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

  // 1. Migrate Merchants
  console.log(`Migrating ${dump.merchants.length} Merchants...`);
  for (const item of dump.merchants) {
    await prisma.merchant.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        business_name: item.business_name,
        business_phone: item.business_phone,
        email: item.email,
        location: item.location,
        logo_url: item.logo_url,
        brand_color: item.brand_color,
        whatsapp_number: item.whatsapp_number,
        status: item.status,
        created_at: new Date(item.created_at),
      },
    });
  }

  // 2. Migrate Merchant Users
  console.log(`Migrating ${dump.merchantUsers.length} Merchant Users...`);
  for (const item of dump.merchantUsers) {
    await prisma.merchantUser.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        merchant_id: item.merchant_id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        avatar_url: item.avatar_url,
        role: item.role,
        password_hash: item.password_hash,
        pin_hash: item.pin_hash,
        otp_code: item.otp_code,
        otp_expires_at: item.otp_expires_at ? new Date(item.otp_expires_at) : null,
        status: item.status,
        created_at: new Date(item.created_at),
      },
    });
  }

  // 3. Migrate Deliveries
  console.log(`Migrating ${dump.deliveries.length} Deliveries...`);
  for (const item of dump.deliveries) {
    await prisma.delivery.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        merchant_id: item.merchant_id,
        customer_phone: item.customer_phone,
        delivery_address: item.delivery_address,
        product_description: item.product_description,
        driver_name: item.driver_name,
        driver_phone: item.driver_phone,
        status: item.status,
        tracking_token: item.tracking_token,
        driver_token: item.driver_token,
        created_at: new Date(item.created_at),
        started_at: item.started_at ? new Date(item.started_at) : null,
        arrived_at: item.arrived_at ? new Date(item.arrived_at) : null,
        delivered_at: item.delivered_at ? new Date(item.delivered_at) : null,
      },
    });
  }

  // 4. Migrate Delivery Events
  console.log(`Migrating ${dump.deliveryEvents.length} Delivery Events...`);
  for (const item of dump.deliveryEvents) {
    await prisma.deliveryEvent.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        delivery_id: item.delivery_id,
        event_type: item.event_type,
        actor_type: item.actor_type,
        actor_reference: item.actor_reference,
        timestamp: new Date(item.timestamp),
        metadata: item.metadata,
        ip_address: item.ip_address,
        device_information: item.device_information,
      },
    });
  }

  // 5. Migrate Notifications
  console.log(`Migrating ${dump.notifications.length} Notifications...`);
  for (const item of dump.notifications) {
    await prisma.notification.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        delivery_id: item.delivery_id,
        event_id: item.event_id,
        channel: item.channel,
        recipient: item.recipient,
        template_id: item.template_id,
        provider_message_id: item.provider_message_id,
        status: item.status,
        sent_at: item.sent_at ? new Date(item.sent_at) : null,
        delivered_at: item.delivered_at ? new Date(item.delivered_at) : null,
        read_at: item.read_at ? new Date(item.read_at) : null,
        failed_at: item.failed_at ? new Date(item.failed_at) : null,
        failure_reason: item.failure_reason,
      },
    });
  }

  // 6. Migrate Notification Templates
  console.log(`Migrating ${dump.templates.length} Notification Templates...`);
  for (const item of dump.templates) {
    await prisma.notificationTemplate.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        event_type: item.event_type,
        channel: item.channel,
        language: item.language,
        body: item.body,
        active_version: item.active_version,
        created_at: new Date(item.created_at),
      },
    });
  }

  // 7. Migrate Audit Logs
  console.log(`Migrating ${dump.auditLogs.length} Audit Logs...`);
  for (const item of dump.auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        merchant_id: item.merchant_id,
        user_id: item.user_id,
        admin_id: item.admin_id,
        action: item.action,
        object_type: item.object_type,
        object_id: item.object_id,
        timestamp: new Date(item.timestamp),
        metadata: item.metadata,
      },
    });
  }

  // Verification Counts
  const pgMerchantsCount = await prisma.merchant.count();
  const pgMerchantUsersCount = await prisma.merchantUser.count();
  const pgDeliveriesCount = await prisma.delivery.count();
  const pgDeliveryEventsCount = await prisma.deliveryEvent.count();
  const pgNotificationsCount = await prisma.notification.count();
  const pgTemplatesCount = await prisma.notificationTemplate.count();
  const pgAuditLogsCount = await prisma.auditLog.count();

  console.log('\n--- MIGRATION VERIFICATION REPORT ---');
  console.log(`Merchants: Dump=${dump.merchants.length} | PG=${pgMerchantsCount} -> ${dump.merchants.length === pgMerchantsCount ? 'PASS' : 'FAIL'}`);
  console.log(`MerchantUsers: Dump=${dump.merchantUsers.length} | PG=${pgMerchantUsersCount} -> ${dump.merchantUsers.length === pgMerchantUsersCount ? 'PASS' : 'FAIL'}`);
  console.log(`Deliveries: Dump=${dump.deliveries.length} | PG=${pgDeliveriesCount} -> ${dump.deliveries.length === pgDeliveriesCount ? 'PASS' : 'FAIL'}`);
  console.log(`DeliveryEvents: Dump=${dump.deliveryEvents.length} | PG=${pgDeliveryEventsCount} -> ${dump.deliveryEvents.length === pgDeliveryEventsCount ? 'PASS' : 'FAIL'}`);
  console.log(`Notifications: Dump=${dump.notifications.length} | PG=${pgNotificationsCount} -> ${dump.notifications.length === pgNotificationsCount ? 'PASS' : 'FAIL'}`);
  console.log(`NotificationTemplates: Dump=${dump.templates.length} | PG=${pgTemplatesCount} -> ${dump.templates.length === pgTemplatesCount ? 'PASS' : 'FAIL'}`);
  console.log(`AuditLogs: Dump=${dump.auditLogs.length} | PG=${pgAuditLogsCount} -> ${dump.auditLogs.length === pgAuditLogsCount ? 'PASS' : 'FAIL'}`);
  console.log('--- Migration Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
