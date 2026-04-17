import { PrismaClient } from '@prisma/client';

export async function seedRolePermissions(
  prisma: PrismaClient,
  roleMap: Record<string, string>,
  permissionMap: Record<string, string>,
) {
  const rolePermissions = [
    { role: 'ADMIN', perms: Object.keys(permissionMap) },
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

  console.log('Role-Permissions seeded');
}