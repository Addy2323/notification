import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial LUMO database data...');

  // Default templates
  const templates = [
    {
      event_type: 'DELIVERY_CREATED',
      channel: 'SMS',
      language: 'en',
      body: '{{merchant_name}} has registered a delivery for {{product_name}}. Track it here: {{tracking_url}}',
    },
    {
      event_type: 'ON_THE_WAY',
      channel: 'SMS',
      language: 'en',
      body: 'Your {{product_name}} from {{merchant_name}} is on the way. Driver: {{driver_name}}. Track: {{tracking_url}}',
    },
    {
      event_type: 'ARRIVED',
      channel: 'SMS',
      language: 'en',
      body: 'Your driver from {{merchant_name}} has arrived at the delivery location. Please receive your {{product_name}}.',
    },
    {
      event_type: 'DELIVERED',
      channel: 'SMS',
      language: 'en',
      body: 'Your {{product_name}} has been marked as delivered. Thank you.',
    },
  ];

  for (const t of templates) {
    const existing = await prisma.notificationTemplate.findFirst({
      where: { event_type: t.event_type, language: t.language },
    });
    if (!existing) {
      await prisma.notificationTemplate.create({ data: t });
    }
  }

  // Seed Demo Merchant & Merchant User
  const demoMerchantPhone = '+255712345678';
  let merchant = await prisma.merchant.findFirst({
    where: { business_phone: demoMerchantPhone },
  });

  if (!merchant) {
    const passwordHash = await bcrypt.hash('123456', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    merchant = await prisma.merchant.create({
      data: {
        business_name: 'Lotus Rise Store',
        business_phone: demoMerchantPhone,
        email: 'merchant@lotusrise.com',
        location: 'Kijitonyama, Dar es Salaam',
        brand_color: '#1E40AF',
        whatsapp_number: '+255712345678',
        users: {
          create: {
            name: 'Demo Merchant',
            phone: demoMerchantPhone,
            email: 'merchant@lotusrise.com',
            role: 'MERCHANT',
            password_hash: passwordHash,
            pin_hash: pinHash,
          },
        },
      },
    });

    console.log('Created Demo Merchant: Lotus Rise Store (PIN: 1234, Password: 123456)');
  }

  // Seed Admin User
  const adminPhone = '+255600000000';
  let admin = await prisma.merchantUser.findFirst({
    where: { phone: adminPhone },
  });

  if (!admin) {
    const adminPassHash = await bcrypt.hash('admin123', 10);
    const adminPinHash = await bcrypt.hash('9999', 10);

    admin = await prisma.merchantUser.create({
      data: {
        merchant_id: merchant.id,
        name: 'LUMO Administrator',
        phone: adminPhone,
        email: 'admin@lumo.co.tz',
        role: 'ADMIN',
        password_hash: adminPassHash,
        pin_hash: adminPinHash,
      },
    });

    console.log('Created Demo Admin (Phone: +255600000000, PIN: 9999, Pass: admin123)');
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
