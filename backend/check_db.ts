import { prisma } from './src/database/prisma';

async function main() {
  const merchants = await prisma.merchant.findMany({
    include: { users: true }
  });
  console.log('--- ALL MERCHANTS IN DB ---');
  console.log(JSON.stringify(merchants, null, 2));

  const users = await prisma.merchantUser.findMany();
  console.log('--- ALL USERS IN DB ---');
  console.log(JSON.stringify(users, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
