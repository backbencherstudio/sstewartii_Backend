import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { seedRoles } from './seeds/role.seed';
import { seedPermissions } from './seeds/permission.seed';
import { seedRolePermissions } from './seeds/role-permission.seed';
import { seedReviewTags } from './seeds/review-tag.seed';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {

  const roleMap = await seedRoles(prisma);

  const permissionMap = await seedPermissions(prisma);

  await seedRolePermissions(prisma, roleMap, permissionMap);

  await seedReviewTags(prisma);

  console.log('All seeds completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });