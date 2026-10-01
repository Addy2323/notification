import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Reading SQLite database records from:', process.env.DATABASE_URL);

  const merchants = await prisma.merchant.findMany();
  const merchantUsers = await prisma.merchantUser.findMany();
  const deliveries = await prisma.delivery.findMany();
  const deliveryEvents = await prisma.deliveryEvent.findMany();
  const notifications = await prisma.notification.findMany();
  const templates = await prisma.notificationTemplate.findMany();
  const auditLogs = await prisma.auditLog.findMany();

  const dump = {
    merchants,
    merchantUsers,
    deliveries,
    deliveryEvents,
    notifications,
    templates,
    auditLogs,
  };

  const outputPath = path.join(__dirname, 'sqlite_dump.json');
  fs.writeFileSync(outputPath, JSON.stringify(dump, null, 2));

  console.log('--- SQLite Record Summary ---');
  console.log(`Merchants: ${merchants.length}`);
  console.log(`MerchantUsers: ${merchantUsers.length}`);
  console.log(`Deliveries: ${deliveries.length}`);
  console.log(`DeliveryEvents: ${deliveryEvents.length}`);
  console.log(`Notifications: ${notifications.length}`);
  console.log(`NotificationTemplates: ${templates.length}`);
  console.log(`AuditLogs: ${auditLogs.length}`);
  console.log(`Saved dump to: ${outputPath}`);
}

main()
  .catch((e) => {
    console.error('Error dumping SQLite:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
