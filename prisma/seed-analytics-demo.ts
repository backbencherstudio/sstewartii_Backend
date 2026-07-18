import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, OrderStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const VENDOR_CODE = process.env.DEMO_VENDOR_CODE || 'VENDOR001';
const DEMO_CUSTOMER_COUNT = 25;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// Weighted hour picker: biases towards lunch (12-14) and dinner (17-20) peaks
function weightedHour(): number {
  const weights = [
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    3,
    4,
    5,
    6,
    8, // 0-11
    10,
    9,
    6,
    5,
    5,
    8,
    10,
    9,
    6,
    4,
    3,
    2, // 12-23
  ];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let hour = 0; hour < 24; hour++) {
    r -= weights[hour];
    if (r <= 0) return hour;
  }
  return 12;
}

// Weighted status: mostly completed, some cancelled, a few in-flight for "today"
function weightedStatus(isToday: boolean): OrderStatus {
  if (isToday) {
    const pool: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.COMPLETED,
      OrderStatus.COMPLETED,
    ];
    return pick(pool);
  }
  const pool: OrderStatus[] = [
    ...Array(8).fill(OrderStatus.COMPLETED),
    ...Array(2).fill(OrderStatus.CANCELLED),
  ];
  return pick(pool);
}

// Ratings skewed towards 4-5 stars (to land near a 4.7 average)
function weightedRating(): number {
  const pool = [5, 5, 5, 5, 5, 5, 4, 4, 4, 3];
  return pick(pool);
}

async function main() {
  console.log(`🌱 Seeding analytics demo data for vendor: ${VENDOR_CODE}`);

  const vendor = await prisma.vendor.findUnique({
    where: { vendorCode: VENDOR_CODE },
    include: { products: true },
  });

  if (!vendor)
    throw new Error(
      `Vendor with code ${VENDOR_CODE} not found. Run main seed first.`,
    );
  if (vendor.products.length === 0)
    throw new Error('Vendor has no products. Run main seed first.');

  const userRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'USER' },
  });
  const productIds = vendor.products.map((p) => p.id);

  // ============================================
  // 1. CREATE DEMO CUSTOMERS
  // ============================================
  console.log('📝 Creating demo customers...');

  const demoCustomers: { id: string }[] = [];

  for (let i = 1; i <= DEMO_CUSTOMER_COUNT; i++) {
    const email = `demo.customer${i}@example.com`;
    const hashedPassword = await bcrypt.hash('demo12345', 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: hashedPassword,
        name: `Demo Customer ${i}`,
        roleId: userRole.id,
        isEmailVerified: true,
      },
    });

    const customer = await prisma.customer.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, isActive: true },
    });

    demoCustomers.push({ id: customer.id });
  }
  console.log(`✅ ${demoCustomers.length} demo customers ready`);

  // ============================================
  // 2. CREATE ORDERS ACROSS THE CURRENT MONTH
  // ============================================
  console.log('📝 Creating orders across current month...');

  const now = new Date();
  const today = now.getDate();
  let ordersCreated = 0;

  for (let day = 1; day <= today; day++) {
    const isToday = day === today;
    const ordersToday = randomInt(3, 12);

    for (let o = 0; o < ordersToday; o++) {
      const hour = weightedHour();
      // don't create orders in the future within "today"
      const safeHour = isToday ? Math.min(hour, now.getHours()) : hour;
      const createdAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        day,
        safeHour,
        randomInt(0, 59),
      );

      const customer = pick(demoCustomers);
      const status = weightedStatus(isToday);

      const numItems = randomInt(1, 3);
      const chosenProductIds = Array.from({ length: numItems }, () =>
        pick(productIds),
      );

      const products = await prisma.product.findMany({
        where: { id: { in: chosenProductIds } },
      });

      let subtotal = 0;
      const itemsPayload = products.map((p) => {
        const quantity = randomInt(1, 3);
        const lineTotal = p.price * quantity;
        subtotal += lineTotal;
        return {
          productId: p.id,
          productName: p.name,
          quantity,
          unitPrice: p.price,
          lineTotal,
        };
      });

      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const serviceFee = 0.99;
      const totalAmount = Math.round((subtotal + tax + serviceFee) * 100) / 100;

      const isCompleted = status === OrderStatus.COMPLETED;
      const isCancelled = status === OrderStatus.CANCELLED;

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-${createdAt.getTime()}-${randomInt(1000, 9999)}`,
          customerId: customer.id,
          vendorId: vendor.id,
          status,
          subtotal,
          tax,
          serviceFee,
          totalAmount,
          createdAt,
          confirmedAt:
            status !== OrderStatus.PENDING
              ? new Date(createdAt.getTime() + 2 * 60000)
              : null,
          preparingAt: ['PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'].includes(
            status,
          )
            ? new Date(createdAt.getTime() + 5 * 60000)
            : null,
          readyAt: ['READY_FOR_PICKUP', 'COMPLETED'].includes(status)
            ? new Date(createdAt.getTime() + 15 * 60000)
            : null,
          completedAt: isCompleted
            ? new Date(createdAt.getTime() + 25 * 60000)
            : null,
          cancelledAt: isCancelled
            ? new Date(createdAt.getTime() + 10 * 60000)
            : null,
        },
      });

      await prisma.orderItem.createMany({
        data: itemsPayload.map((i) => ({ ...i, orderId: order.id })),
      });

      ordersCreated++;
    }
  }
  console.log(`✅ ${ordersCreated} orders created across the month`);

  // ============================================
  // 3. CREATE PROFILE VIEWS ACROSS THE MONTH
  // ============================================
  console.log('📝 Creating profile views...');

  let viewsCreated = 0;
  for (let day = 1; day <= today; day++) {
    const viewsToday = randomInt(15, 35);
    for (let v = 0; v < viewsToday; v++) {
      const hour = weightedHour();
      const safeHour = day === today ? Math.min(hour, now.getHours()) : hour;
      const viewedAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        day,
        safeHour,
        randomInt(0, 59),
      );
      const attachCustomer = Math.random() < 0.5;

      await prisma.vendorProfileView.create({
        data: {
          vendorId: vendor.id,
          customerId: attachCustomer ? pick(demoCustomers).id : null,
          viewedAt,
        },
      });
      viewsCreated++;
    }
  }
  console.log(`✅ ${viewsCreated} profile views created`);

  // ============================================
  // 4. CREATE TRUCK REVIEWS (ratings)
  // ============================================
  console.log('📝 Creating truck reviews...');

  const reviewSampleSize = Math.min(demoCustomers.length, 20);
  const reviewTexts = [
    'Amazing food, quick service!',
    'Best food truck in the area, highly recommend.',
    'Great flavors, will order again.',
    'Solid meal, fair price.',
    'Loved the tacos, super fresh.',
  ];

  for (let i = 0; i < reviewSampleSize; i++) {
    const customer = demoCustomers[i];
    await prisma.vendorTruckReview.upsert({
      where: {
        vendorId_customerId: { vendorId: vendor.id, customerId: customer.id },
      },
      update: { rating: weightedRating() },
      create: {
        vendorId: vendor.id,
        customerId: customer.id,
        rating: weightedRating(),
        reviewText: pick(reviewTexts),
      },
    });
  }

  const ratingAgg = await prisma.vendorTruckReview.aggregate({
    where: { vendorId: vendor.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      truckReviewAverage: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
      truckReviewCount: ratingAgg._count.rating,
    },
  });
  console.log(
    `✅ ${reviewSampleSize} reviews created — avg rating ${ratingAgg._avg.rating?.toFixed(1)}`,
  );

  // ============================================
  // 5. CREATE FAVORITES
  // ============================================
  console.log('📝 Creating favorites...');

  let favoritesCreated = 0;
  // not every demo customer favorites — pick ~70% for realism
  for (const customer of demoCustomers) {
    if (Math.random() > 0.3) {
      await prisma.favoriteVendor.upsert({
        where: {
          customerId_vendorId: { customerId: customer.id, vendorId: vendor.id },
        },
        update: {},
        create: { customerId: customer.id, vendorId: vendor.id },
      });
      favoritesCreated++;
    }
  }
  console.log(`✅ ${favoritesCreated} favorites created`);

  console.log('🎉 Analytics demo data seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Analytics demo seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
