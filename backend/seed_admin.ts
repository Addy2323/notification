import bcrypt from 'bcryptjs';
import { prisma } from './src/database/prisma';

async function main() {
  const phoneRaw = '0711788830';
  const phoneIntl = '+255711788830';
  const passwordPlain = 'Given@2323';
  const pinPlain = '2016';
  const email = 'admin@lumo.co.tz';

  console.log('Generating bcrypt hashes...');
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  const pinHash = await bcrypt.hash(pinPlain, 10);

  // Find or create admin merchant container
  let merchant = await prisma.merchant.findFirst({
    where: { status: 'ACTIVE' }
  });

  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        business_name: 'LUMO Platform Administration',
        business_phone: phoneIntl,
        status: 'ACTIVE'
      }
    });
  }

  // Delete any existing user with this phone or email to ensure clean state
  await prisma.merchantUser.deleteMany({
    where: {
      OR: [
        { phone: phoneRaw },
        { phone: phoneIntl },
        { email }
      ]
    }
  });

  // Create clean ADMIN user
  const adminUser = await prisma.merchantUser.create({
    data: {
      merchant_id: merchant.id,
      name: 'Super Administrator',
      phone: phoneIntl,
      email,
      role: 'ADMIN',
      password_hash: passwordHash,
      pin_hash: pinHash,
      status: 'ACTIVE'
    }
  });

  console.log('Successfully created Admin user in database:');
  console.log({
    id: adminUser.id,
    name: adminUser.name,
    phone: adminUser.phone,
    email: adminUser.email,
    role: adminUser.role,
    status: adminUser.status,
    password_hash: adminUser.password_hash,
    pin_hash: adminUser.pin_hash
  });

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to create admin user:', err);
  process.exit(1);
});
