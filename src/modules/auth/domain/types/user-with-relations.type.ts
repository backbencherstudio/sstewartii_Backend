import { Prisma } from '@prisma/client';

export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    role: true;

    customer: true;

    vendorStore: {
      include: {
        serviceArea: true;
      };
    };
  };
}>;
