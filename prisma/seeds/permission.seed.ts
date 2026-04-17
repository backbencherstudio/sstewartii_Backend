import { PrismaClient } from '@prisma/client';

export async function seedPermissions(prisma: PrismaClient) {
  const permissions = [
    'read:user',
    'create:user',
    'update:user',
    'delete:user',
  ];

  const permissionMap: Record<string, string> = {};

  for (const name of permissions) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    permissionMap[name] = perm.id;
  }

  console.log('Permissions seeded');

  return permissionMap;
}