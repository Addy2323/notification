import { prisma } from './src/database/prisma';
import fs from 'fs';

async function dump() {
  const merchants = await prisma.merchant.findMany({
    include: { users: true, _count: true }
  });
  const users = await prisma.merchantUser.findMany({
    include: { merchant: true }
  });
  fs.writeFileSync('db_dump.json', JSON.stringify({ merchants, users }, null, 2));
  console.log('Dump completed to db_dump.json');
  process.exit(0);
}

dump().catch(err => {
  console.error(err);
  process.exit(1);
});
