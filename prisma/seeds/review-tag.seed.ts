import { PrismaClient } from '@prisma/client';

export async function seedReviewTags(prisma: PrismaClient) {
  const tags = [
    'Fast Service',
    'Tasty',
    'Fresh Ingredients',
    'Great Portion',
    'Friendly Staff',
    'Worth the Price',
    'Good Packaging',
    'Value for Money',
  ];

  for (const name of tags) {
    await prisma.reviewTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Review tags seeded');
}