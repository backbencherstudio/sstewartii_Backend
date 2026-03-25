import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg'; 
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter });

async function main() {

  const roles = ['ADMIN', 'USER'];
  const roleMap: Record<string, string> = {};

  for (const role_name of roles) {
    const role = await prisma.role.upsert({
      where: { name: role_name },
      update: {},
      create: { name: role_name },
    });
    roleMap[role_name] = role.id;
  }

  const permissions =['read:user', 'create:user', 'update:user', 'delete:user'];
  const permissionMap: Record<string, string> = {};

  for (const name of permissions) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    permissionMap[name] = perm.id;
  }
  
  const rolePermissions =[
    { role: 'ADMIN', perms: permissions }, 
    { role: 'USER', perms: ['read:user'] },
  ];

  for (const rp of rolePermissions) {
    for (const permName of rp.perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleMap[rp.role],
            permissionId: permissionMap[permName],
          },
        },
        update: {},
        create: {
          roleId: roleMap[rp.role],
          permissionId: permissionMap[permName],
        },
      });
    }
  }

  // const hashedPassword = await bcrypt.hash('Admin123!', 10);
  // await prisma.user.upsert({
  //   where: { email: 'admin@example.com' },
  //   update: {},
  //   create: {
  //     email: 'admin@example.com',
  //     password: hashedPassword,
  //     roleId: roleMap['ADMIN'], 
  //   },
  // });

  console.log(' Seed finished successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); 
  });