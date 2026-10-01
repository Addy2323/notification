import { prisma } from './src/database/prisma';

async function check() {
  const admin = await prisma.merchantUser.findFirst({
    where: {
      OR: [
        { phone: '0711788830' },
        { phone: '+255711788830' }
      ]
    }
  });

  console.log('=== ADMIN USER RECORD IN DB ===');
  console.log(JSON.stringify(admin, null, 2));
  await prisma.$disconnect();
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
