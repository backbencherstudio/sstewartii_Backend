import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  const roles = ['ADMIN', 'USER', 'VENDOR'];

  const roleMap: Record<string, string> = {};

  for (const name of roles) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    roleMap[name] = role.id;
  }

  console.log('Roles seeded');

  return roleMap;
}