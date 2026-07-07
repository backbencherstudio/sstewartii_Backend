import * as dotenv from 'dotenv';
dotenv.config();

import { OrderStatus, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL as string;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// Helper function to create or update records with proper typing
async function upsertData<T>(
  model: any,
  where: any,
  create: any,
  update?: any,
): Promise<T> {
  try {
    const result = await model.upsert({
      where,
      update: update || create,
      create,
    });
    return result as T;
  } catch (error) {
    console.error(`Error upserting data:`, error);
    throw error;
  }
}

// Type definitions
type RoleName = 'ADMIN' | 'USER' | 'VENDOR';
type PlanCode = 'FREE_TRIAL' | 'STARTER' | 'PRO' | 'ELITE' | 'FREE_USER';
type PermissionName =
  | 'read:user'
  | 'create:user'
  | 'update:user'
  | 'delete:user'
  | 'read:vendor'
  | 'create:vendor'
  | 'update:vendor'
  | 'delete:vendor'
  | 'read:product'
  | 'create:product'
  | 'update:product'
  | 'delete:product'
  | 'read:order'
  | 'create:order'
  | 'update:order'
  | 'delete:order'
  | 'manage:reports'
  | 'manage:tickets';

async function main(): Promise<void> {
  console.log('🌱 Starting seed process...');

  // ============================================
  // 1. SEED ROLES
  // ============================================
  console.log('📝 Seeding roles...');

  const roles: RoleName[] = ['ADMIN', 'USER', 'VENDOR'];
  const roleMap: Record<RoleName, string> = {} as Record<RoleName, string>;

  for (const name of roles) {
    const role = await upsertData<{ id: string }>(
      prisma.role,
      { name },
      { name },
    );
    roleMap[name] = role.id;
    console.log(`✅ Role created/updated: ${name}`);
  }

  // ============================================
  // 2. SEED PERMISSIONS
  // ============================================
  console.log('📝 Seeding permissions...');

  const permissions: PermissionName[] = [
    'read:user',
    'create:user',
    'update:user',
    'delete:user',
    'read:vendor',
    'create:vendor',
    'update:vendor',
    'delete:vendor',
    'read:product',
    'create:product',
    'update:product',
    'delete:product',
    'read:order',
    'create:order',
    'update:order',
    'delete:order',
    'manage:reports',
    'manage:tickets',
  ];

  const permissionMap: Record<PermissionName, string> = {} as Record<
    PermissionName,
    string
  >;

  for (const name of permissions) {
    const perm = await upsertData<{ id: string }>(
      prisma.permission,
      { name },
      { name },
    );
    permissionMap[name] = perm.id;
    console.log(`✅ Permission created/updated: ${name}`);
  }

  // ============================================
  // 3. SEED ROLE-PERMISSIONS
  // ============================================
  console.log('📝 Seeding role-permissions...');

  const rolePermissions: Array<{
    role: RoleName;
    perms: PermissionName[];
  }> = [
    { role: 'ADMIN', perms: Object.keys(permissionMap) as PermissionName[] },
    {
      role: 'USER',
      perms: ['read:user', 'read:vendor', 'read:product', 'read:order'],
    },
    {
      role: 'VENDOR',
      perms: [
        'read:vendor',
        'create:vendor',
        'update:vendor',
        'read:product',
        'create:product',
        'update:product',
        'read:order',
        'create:order',
        'update:order',
      ],
    },
  ];

  for (const rp of rolePermissions) {
    for (const permName of rp.perms) {
      await upsertData(
        prisma.rolePermission,
        {
          roleId_permissionId: {
            roleId: roleMap[rp.role],
            permissionId: permissionMap[permName],
          },
        },
        {
          roleId: roleMap[rp.role],
          permissionId: permissionMap[permName],
        },
      );
    }
  }
  console.log('✅ Role-permissions seeded');

  // ============================================
  // 4. SEED SUBSCRIPTION PLANS
  // ============================================
  console.log('📝 Seeding subscription plans...');

  const subscriptionPlans = [
    {
      name: 'Free Trial',
      code: 'FREE_TRIAL' as PlanCode,
      price: 0,
      durationDays: 30,
      maxProducts: 5,
      stripePriceId: 'price_free_trial',
      currency: 'USD',
      position: 0,
      isActive: true,
    },
    {
      name: 'Starter',
      code: 'STARTER' as PlanCode,
      price: 29.99,
      durationDays: 30,
      maxProducts: 20,
      stripePriceId: 'price_starter',
      currency: 'USD',
      position: 1,
      isActive: true,
    },
    {
      name: 'Pro',
      code: 'PRO' as PlanCode,
      price: 59.99,
      durationDays: 30,
      maxProducts: 50,
      stripePriceId: 'price_pro',
      currency: 'USD',
      position: 2,
      isActive: true,
    },
    {
      name: 'Elite',
      code: 'ELITE' as PlanCode,
      price: 99.99,
      durationDays: 30,
      maxProducts: 100,
      stripePriceId: 'price_elite',
      currency: 'USD',
      position: 3,
      isActive: true,
    },
    {
      name: 'Free User',
      code: 'FREE_USER' as PlanCode,
      price: 0,
      durationDays: 0,
      maxProducts: 0,
      stripePriceId: 'price_free_user',
      currency: 'USD',
      position: 4,
      isActive: true,
    },
  ];

  const subscriptionPlanMap: Record<PlanCode, string> = {} as Record<
    PlanCode,
    string
  >;

  for (const plan of subscriptionPlans) {
    const createdPlan = await upsertData<{ id: string }>(
      prisma.subscriptionPlan,
      { code: plan.code },
      plan,
    );
    subscriptionPlanMap[plan.code] = createdPlan.id;
    console.log(`✅ Subscription plan created/updated: ${plan.name}`);
  }

  // ============================================
  // 5. SEED CUISINES
  // ============================================
  console.log('📝 Seeding cuisines...');

  const cuisines = [
    'American',
    'Mexican',
    'Italian',
    'Chinese',
    'Japanese',
    'Thai',
    'Indian',
    'Mediterranean',
    'French',
    'Spanish',
    'Korean',
    'Vietnamese',
    'Caribbean',
    'Middle Eastern',
    'Fusion',
  ];

  const cuisineMap: Record<string, string> = {};

  for (const [index, name] of cuisines.entries()) {
    const cuisine = await upsertData<{ id: string }>(
      prisma.cuisine,
      { name },
      {
        name,
        imageUrl: `https://plus.unsplash.com/premium_photo-1675252369719-dd52bc69c3df?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`,
        isActive: true,
        position: index,
      },
      {
        isActive: true,
        position: index,
      },
    );
    cuisineMap[name] = cuisine.id;
  }
  console.log(`✅ ${cuisines.length} cuisines seeded`);

  // ============================================
  // 6. SEED REVIEW TAGS
  // ============================================
  console.log('📝 Seeding review tags...');

  const vendorReviewTags = [
    'Fast Service',
    'Tasty',
    'Fresh Ingredients',
    'Great Portion',
    'Friendly Staff',
    'Worth the Price',
    'Good Packaging',
    'Value for Money',
    'Clean Truck',
    'Quick Pickup',
    'Good Customer Service',
  ];

  for (const name of vendorReviewTags) {
    await upsertData(prisma.vendorTruckReviewTag, { name }, { name });
  }
  console.log(`✅ ${vendorReviewTags.length} vendor review tags seeded`);

  const foodReviewTags = [
    'Tasty',
    'Fresh',
    'Spicy',
    'Good Portion',
    'Too Salty',
    'Well Cooked',
    'Flavorful',
    'Authentic',
    'Delicious',
    'Good Value',
  ];

  for (const name of foodReviewTags) {
    await upsertData(prisma.foodReviewTag, { name }, { name });
  }
  console.log(`✅ ${foodReviewTags.length} food review tags seeded`);

  // ============================================
  // 7. CREATE USERS
  // ============================================
  console.log('📝 Creating users...');

  const usersData = [
    {
      email: 'admin@gmail.com',
      password: '12345678',
      name: 'Super Admin',
      role: 'ADMIN' as RoleName,
      provider: 'local',
      isEmailVerified: true,
    },
    {
      email: 'user@gmail.com',
      password: '12345678',
      name: 'John Doe',
      role: 'USER' as RoleName,
      provider: 'local',
      isEmailVerified: true,
    },
    {
      email: 'vendor@gmail.com',
      password: '12345678',
      name: 'Jane Smith',
      role: 'VENDOR' as RoleName,
      provider: 'local',
      isEmailVerified: true,
    },
  ];

  const userIds: Record<string, string> = {};

  for (const userData of usersData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await upsertData<{ id: string }>(
      prisma.user,
      { email: userData.email },
      {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        roleId: roleMap[userData.role],
        provider: userData.provider,
        isEmailVerified: userData.isEmailVerified,
      },
      {
        name: userData.name,
        password: hashedPassword,
        roleId: roleMap[userData.role],
        isEmailVerified: userData.isEmailVerified,
      },
    );

    userIds[userData.email] = user.id;
    console.log(
      `✅ User created/updated: ${userData.email} (${userData.role})`,
    );
  }

  // ============================================
  // 8. CREATE CUSTOMER (for USER role)
  // ============================================
  console.log('📝 Creating customer...');

  const customer = await upsertData<{ id: string }>(
    prisma.customer,
    { userId: userIds['user@gmail.com'] },
    {
      userId: userIds['user@gmail.com'],
      phoneNumber: '+1234567890',
      dateOfBirth: new Date('1995-05-15'),
      address: '123 Main Street, New York, NY 10001',
      latitude: 40.7128,
      longitude: -74.006,
      avatar: 'https://example.com/avatars/user-avatar.jpg',
      isActive: true,
      preferredRadius: 10,
    },
    {
      phoneNumber: '+1234567890',
      address: '123 Main Street, New York, NY 10001',
      latitude: 40.7128,
      longitude: -74.006,
      isActive: true,
    },
  );
  console.log('✅ Customer created/updated');

  // ============================================
  // 9. CREATE VENDOR
  // ============================================
  console.log('📝 Creating vendor...');

  const vendorCode = 'VENDOR001';

  const vendor = await upsertData<any>(
    prisma.vendor,
    { vendorCode },
    {
      vendorCode,
      businessName: 'Taco Paradise Food Truck',
      publicEmail: 'tacoparadise@example.com',
      contactNumber: '+9876543210',
      bio: 'Authentic Mexican street food made with love and fresh ingredients. Serving the community since 2020.',
      coverImage:
        'https://plus.unsplash.com/premium_photo-1671656349218-5218444643d8?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      onboardingStep: 5,
      ownerId: userIds['vendor@gmail.com'],
      kycStatus: 'APPROVED',
      subscriptionPlanId: subscriptionPlanMap['FREE_TRIAL'],
      subscriptionStatus: 'ACTIVE',
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ONLINE',
      adminStatus: 'ACTIVE',
      truckReviewAverage: 4.5,
      truckReviewCount: 25,
    },
    {
      businessName: 'Taco Paradise Food Truck',
      publicEmail: 'tacoparadise@example.com',
      contactNumber: '+9876543210',
      bio: 'Authentic Mexican street food made with love and fresh ingredients. Serving the community since 2020.',
      coverImage:
        'https://images.unsplash.com/photo-1728577740843-5f29c7586afe?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      onboardingStep: 5,
      kycStatus: 'APPROVED',
      subscriptionStatus: 'ACTIVE',
      status: 'ONLINE',
      adminStatus: 'ACTIVE',
    },
  );
  console.log(
    `✅ Vendor created/updated: ${vendor.businessName || vendorCode}`,
  );

  // ============================================
  // 10. CREATE VENDOR SUBSCRIPTION
  // ============================================
  console.log('📝 Creating vendor subscription...');

  await upsertData(
    prisma.vendorSubscription,
    { vendorId: vendor.id },
    {
      vendorId: vendor.id,
      subscriptionPlanId: subscriptionPlanMap['FREE_TRIAL'],
      provider: 'MANUAL',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      subscriptionPlanId: subscriptionPlanMap['FREE_TRIAL'],
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  );
  console.log('✅ Vendor subscription created/updated');

  // ============================================
  // 11. CREATE KYC PROFILE
  // ============================================
  console.log('📝 Creating KYC profile...');

  const kycDocumentNumber = 'DOC123456789';

  await upsertData(
    prisma.kycProfile,
    { vendorId: vendor.id },
    {
      vendorId: vendor.id,
      documentType: 'NATIONAL_ID',
      documentNumber: kycDocumentNumber,
      frontImageUrl:
        'https://plus.unsplash.com/premium_photo-1661313626999-90d230cabf8d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      backImageUrl:
        'https://plus.unsplash.com/premium_photo-1661313626999-90d230cabf8d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      submittedAt: new Date(),
      verifiedAt: new Date(),
    },
    {
      documentType: 'NATIONAL_ID',
      frontImageUrl:
        'https://plus.unsplash.com/premium_photo-1661313626999-90d230cabf8d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      backImageUrl:
        'https://plus.unsplash.com/premium_photo-1661313626999-90d230cabf8d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      verifiedAt: new Date(),
    },
  );
  console.log('✅ KYC profile created/updated');

  // ============================================
  // 12. CREATE SERVICE AREA
  // ============================================
  console.log('📝 Creating service area...');

  await upsertData(
    prisma.serviceArea,
    { vendorId: vendor.id },
    {
      vendorId: vendor.id,
      latitude: 40.7128,
      longitude: -74.006,
      address: '5th Avenue & 42nd Street, New York, NY',
      radius: 10,
    },
    {
      latitude: 40.7128,
      longitude: -74.006,
      address: '5th Avenue & 42nd Street, New York, NY',
      radius: 10,
    },
  );
  console.log('✅ Service area created/updated');

  // ============================================
  // 13. CREATE OPERATION HOURS
  // ============================================
  console.log('📝 Creating operation hours...');

  const operationHours = [
    { dayOfWeek: 1, openTime: '09:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 2, openTime: '09:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 3, openTime: '09:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 4, openTime: '09:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 5, openTime: '09:00', closeTime: '22:00', isClosed: false },
    { dayOfWeek: 6, openTime: '10:00', closeTime: '22:00', isClosed: false },
    { dayOfWeek: 0, openTime: '10:00', closeTime: '20:00', isClosed: false },
  ];

  for (const hours of operationHours) {
    await prisma.operationHour.upsert({
      where: {
        id: `${vendor.id}-${hours.dayOfWeek}`,
      },
      update: hours,
      create: {
        ...hours,
        vendorId: vendor.id,
        activeFrom: new Date('2024-01-01'),
      },
    });
  }
  console.log('✅ Operation hours created/updated');

  // ============================================
  // 14. CREATE VENDOR CUISINES
  // ============================================
  console.log('📝 Creating vendor cuisines...');

  const vendorCuisines = ['Mexican', 'American', 'Fusion'];

  for (const cuisineName of vendorCuisines) {
    if (cuisineMap[cuisineName]) {
      await prisma.vendorCuisine.upsert({
        where: {
          vendorId_cuisineId: {
            vendorId: vendor.id,
            cuisineId: cuisineMap[cuisineName],
          },
        },
        update: {},
        create: {
          vendorId: vendor.id,
          cuisineId: cuisineMap[cuisineName],
        },
      });
    }
  }
  console.log('✅ Vendor cuisines created/updated');

  // ============================================
  // 15. CREATE SOCIAL LINKS
  // ============================================
  console.log('📝 Creating social links...');

  const socialLinks = [
    { url: 'https://instagram.com/tacoparadise' },
    { url: 'https://facebook.com/tacoparadise' },
    { url: 'https://twitter.com/tacoparadise' },
  ];

  for (const social of socialLinks) {
    await prisma.socialLink.create({
      data: {
        vendorId: vendor.id,
        url: social.url,
      },
    });
  }
  console.log('✅ Social links created');

  // ============================================
  // 16. SEED FOOD CATEGORIES (Vendor-specific)
  // ============================================
  console.log('📝 Seeding food categories for vendor...');

  const categories = [
    'Popular Items',
    'Breakfast',
    'Burgers',
    'Pizza',
    'Tacos & Burritos',
    'Sandwiches & Wraps',
    'Rice Bowls',
    'Noodles & Pasta',
    'BBQ & Grilled',
    'Chicken',
    'Seafood',
    'Vegetarian',
    'Vegan',
    'Halal',
    'Salads',
    'Soups',
    'Sides',
    'Desserts',
    'Drinks',
    'Combo Meals',
  ];

  const categoryMap: Record<string, string> = {};

  for (const [index, name] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: {
        vendorId_name: {
          vendorId: vendor.id,
          name: name,
        },
      },
      update: {
        position: index,
        isActive: true,
      },
      create: {
        name: name,
        vendorId: vendor.id,
        position: index,
        isActive: true,
      },
    });
    categoryMap[name] = category.id;
  }
  console.log(`✅ ${categories.length} food categories seeded`);

  // ============================================
  // 17. CREATE PRODUCTS
  // ============================================
  console.log('📝 Creating products...');

  const products = [
    {
      name: 'Classic Beef Taco',
      description:
        'Seasoned ground beef, lettuce, cheese, and pico de gallo in a crispy corn shell.',
      price: 4.99,
      estimateCookTime: 10,
      categoryName: 'Tacos & Burritos',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Chicken Quesadilla',
      description:
        'Grilled chicken, melted cheese, peppers, and onions in a flour tortilla.',
      price: 7.99,
      estimateCookTime: 15,
      categoryName: 'Tacos & Burritos',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Veggie Burrito Bowl',
      description:
        'Rice, black beans, grilled vegetables, salsa, and guacamole.',
      price: 9.99,
      estimateCookTime: 12,
      categoryName: 'Rice Bowls',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Fish Tacos (3 pcs)',
      description:
        'Battered cod, cabbage slaw, and chipotle sauce in soft corn tortillas.',
      price: 12.99,
      estimateCookTime: 18,
      categoryName: 'Tacos & Burritos',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Churros with Chocolate Sauce',
      description:
        'Crispy fried dough sticks rolled in cinnamon sugar, served with warm chocolate dipping sauce.',
      price: 5.99,
      estimateCookTime: 8,
      categoryName: 'Desserts',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Mexican Street Corn (Elote)',
      description:
        'Grilled corn on the cob with mayonnaise, cheese, chili powder, and lime.',
      price: 3.99,
      estimateCookTime: 8,
      categoryName: 'Sides',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Horchata (16oz)',
      description: 'Traditional Mexican rice drink with cinnamon and vanilla.',
      price: 3.49,
      estimateCookTime: 2,
      categoryName: 'Drinks',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Breakfast Burrito',
      description:
        'Eggs, bacon, potatoes, cheese, and salsa wrapped in a large flour tortilla.',
      price: 8.99,
      estimateCookTime: 12,
      categoryName: 'Breakfast',
      cuisineName: 'American',
      isActive: true,
    },
    {
      name: 'Taco Salad',
      description:
        'Crispy tortilla bowl filled with lettuce, seasoned beef, cheese, tomatoes, and sour cream.',
      price: 10.99,
      estimateCookTime: 14,
      categoryName: 'Salads',
      cuisineName: 'Mexican',
      isActive: true,
    },
    {
      name: 'Queso Fundido',
      description:
        'Warm melted cheese dip with chorizo, served with tortilla chips.',
      price: 6.99,
      estimateCookTime: 7,
      categoryName: 'Sides',
      cuisineName: 'Mexican',
      isActive: true,
    },
  ];

  const productIds: string[] = [];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        estimateCookTime: productData.estimateCookTime,
        vendorId: vendor.id,
        categoryId: productData.categoryName
          ? categoryMap[productData.categoryName]
          : null,
        cuisineId: productData.cuisineName
          ? cuisineMap[productData.cuisineName]
          : null,
        isActive: productData.isActive,
      },
    });
    productIds.push(product.id);
    console.log(`✅ Product created: ${productData.name}`);
  }

  // ============================================
  // 18. CREATE PRODUCT IMAGES
  // ============================================
  console.log('📝 Creating product images...');

  for (const productId of productIds) {
    await prisma.productImage.createMany({
      data: [
        {
          productId,
          url: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`,
          isPrimary: true,
          position: 0,
        },
        {
          productId,
          url: `https://plus.unsplash.com/premium_photo-1673108852141-e8c3c22a4a22?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`,
          isPrimary: false,
          position: 1,
        },
      ],
    });
  }
  console.log('✅ Product images created');

  // ============================================
  // 19. CREATE SIZE OPTIONS
  // ============================================
  console.log('📝 Creating size options...');

  const sizeOptionsData = [
    { productIndex: 0, name: 'Regular', price: 0 },
    { productIndex: 0, name: 'Large', price: 1.99 },
    { productIndex: 1, name: 'Small', price: 0 },
    { productIndex: 1, name: 'Large', price: 2.99 },
    { productIndex: 3, name: 'Regular', price: 0 },
    { productIndex: 3, name: 'Large', price: 1.5 },
    { productIndex: 4, name: '6 pcs', price: 0 },
    { productIndex: 4, name: '12 pcs', price: 3.99 },
  ];

  for (const sizeData of sizeOptionsData) {
    await prisma.sizeOption.create({
      data: {
        productId: productIds[sizeData.productIndex],
        name: sizeData.name,
        price: sizeData.price,
        isRequired: false,
      },
    });
  }
  console.log('✅ Size options created');

  // ============================================
  // 20. CREATE CHOICE OPTIONS
  // ============================================
  console.log('📝 Creating choice options...');

  const choiceOptionsData = [
    { productIndex: 0, name: 'Add Guacamole', price: 1.5 },
    { productIndex: 0, name: 'Add Sour Cream', price: 0.5 },
    { productIndex: 2, name: 'Add Chicken', price: 2.0 },
    { productIndex: 2, name: 'Add Steak', price: 3.0 },
    { productIndex: 2, name: 'Add Tofu', price: 1.5 },
  ];

  for (const choiceData of choiceOptionsData) {
    await prisma.choiceOption.create({
      data: {
        productId: productIds[choiceData.productIndex],
        name: choiceData.name,
        price: choiceData.price,
        isRequired: false,
      },
    });
  }
  console.log('✅ Choice options created');

  // ============================================
  // 21. CREATE ADD-ONS
  // ============================================
  console.log('📝 Creating add-ons...');

  const addOnsData = [
    { productIndex: 0, name: 'Extra Cheese', price: 0.75 },
    { productIndex: 0, name: 'Extra Meat', price: 2.0 },
    { productIndex: 1, name: 'Extra Chicken', price: 2.0 },
    { productIndex: 1, name: 'Extra Cheese', price: 0.75 },
    { productIndex: 3, name: 'Extra Slaw', price: 0.5 },
    { productIndex: 3, name: 'Extra Sauce', price: 0.25 },
  ];

  for (const addOnData of addOnsData) {
    await prisma.addOn.create({
      data: {
        productId: productIds[addOnData.productIndex],
        name: addOnData.name,
        price: addOnData.price,
        isRequired: false,
      },
    });
  }
  console.log('✅ Add-ons created');

  // ============================================
  // 22. CREATE TRUCK GALLERY IMAGES
  // ============================================
  console.log('📝 Creating truck gallery images...');

  const galleryImages = [
    {
      url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=710&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      caption: 'Front view of our food truck',
      isPrimary: true,
    },
    {
      url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      caption: 'Inside the food truck kitchen',
      isPrimary: false,
    },
    {
      url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      caption: 'Side view with menu board',
      isPrimary: false,
    },
    {
      url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      caption: 'Delicious food being prepared',
      isPrimary: false,
    },
  ];

  for (const [index, image] of galleryImages.entries()) {
    await prisma.truckGalleryImage.create({
      data: {
        vendorId: vendor.id,
        url: image.url,
        caption: image.caption,
        isPrimary: image.isPrimary,
        position: index,
      },
    });
  }
  console.log('✅ Truck gallery images created');

  // ============================================
  // 23. CREATE VENDOR VERIFICATION
  // ============================================
  console.log('📝 Creating vendor verification...');

  await upsertData(
    prisma.vendorVerification,
    { vendorId: vendor.id },
    {
      vendorId: vendor.id,
      businessLicense:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      healthPermit:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      insuranceProof:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      status: 'APPROVED',
      submittedAt: new Date('2024-01-01'),
      reviewedAt: new Date('2024-01-02'),
      version: 1,
    },
    {
      status: 'APPROVED',
      reviewedAt: new Date(),
      version: 1,
    },
  );
  console.log('✅ Vendor verification created/updated');

  // ============================================
  // 24. CREATE FAVORITE VENDORS & PRODUCTS
  // ============================================
  console.log('📝 Creating favorites...');

  if (customer && vendor) {
    // Favorite the vendor
    await prisma.favoriteVendor.upsert({
      where: {
        customerId_vendorId: {
          customerId: customer.id,
          vendorId: vendor.id,
        },
      },
      update: {},
      create: {
        customerId: customer.id,
        vendorId: vendor.id,
      },
    });

    // Favorite some products
    for (let i = 0; i < Math.min(3, productIds.length); i++) {
      await prisma.favoriteProduct.upsert({
        where: {
          customerId_productId: {
            customerId: customer.id,
            productId: productIds[i],
          },
        },
        update: {},
        create: {
          customerId: customer.id,
          productId: productIds[i],
        },
      });
    }
    console.log('✅ Favorites created');
  }

  // ============================================
  // 25. CREATE VENDOR TRUCK REVIEWS
  // ============================================
  console.log('📝 Creating vendor truck reviews...');

  if (customer && vendor) {
    const reviewTags = await prisma.vendorTruckReviewTag.findMany({
      take: 3,
    });

    await prisma.vendorTruckReview.upsert({
      where: {
        vendorId_customerId: {
          vendorId: vendor.id,
          customerId: customer.id,
        },
      },
      update: {
        rating: 5,
        reviewText:
          'Amazing food truck! The tacos are the best in NYC. Will definitely order again.',
        updatedAt: new Date(),
      },
      create: {
        vendorId: vendor.id,
        customerId: customer.id,
        rating: 5,
        reviewText:
          'Amazing food truck! The tacos are the best in NYC. Will definitely order again.',
        images: {
          create: [
            {
              imageUrl:
                'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=710&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
              position: 0,
            },
            {
              imageUrl:
                'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=710&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
              position: 1,
            },
          ],
        },
        tags: {
          create: reviewTags.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
    });
    console.log('✅ Vendor truck review created/updated');
  }

  // ============================================
  // 26. CREATE DEMO ORDERS WITH ALL STATUSES
  // ============================================
  console.log('📝 Creating demo orders with all statuses...');

  if (customer && vendor && productIds.length > 0) {
    // Helper function to create order with items
    async function createOrderWithItems(
      status: OrderStatus,
      timeOffset: number,
      customData?: any,
    ) {
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const orderTime = new Date(Date.now() + timeOffset);

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          vendorId: vendor.id,
          status,
          paymentMethod: customData?.paymentMethod || 'COD',
          subtotal: customData?.subtotal || 24.97,
          tax: customData?.tax || 2.5,
          serviceFee: customData?.serviceFee || 0.99,
          totalAmount: customData?.totalAmount || 28.46,
          note: customData?.note || null,
          estimatedReadyAt:
            customData?.estimatedReadyAt ||
            new Date(Date.now() + 30 * 60 * 1000),
          confirmedAt: customData?.confirmedAt || null,
          preparingAt: customData?.preparingAt || null,
          readyAt: customData?.readyAt || null,
          completedAt: customData?.completedAt || null,
          cancelledAt: customData?.cancelledAt || null,
          createdAt: orderTime,
        },
      });

      // Create order items
      const orderItems = [
        {
          productId: productIds[0],
          quantity: 2,
          unitPrice: 4.99,
          lineTotal: 9.98,
        },
        {
          productId: productIds[1],
          quantity: 1,
          unitPrice: 7.99,
          lineTotal: 7.99,
        },
        {
          productId: productIds[3],
          quantity: 1,
          unitPrice: 12.99,
          lineTotal: 12.99,
        },
      ];

      for (const itemData of orderItems) {
        const product = await prisma.product.findUnique({
          where: { id: itemData.productId },
          include: {
            sizeOptions: true,
            choiceOptions: true,
            addOns: true,
          },
        });

        if (product) {
          const orderItem = await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: itemData.productId,
              productName: product.name,
              quantity: itemData.quantity,
              unitPrice: itemData.unitPrice,
              lineTotal: itemData.lineTotal,
              sizeName:
                product.sizeOptions.length > 0
                  ? product.sizeOptions[0].name
                  : null,
              sizePrice:
                product.sizeOptions.length > 0
                  ? product.sizeOptions[0].price
                  : 0,
            },
          });

          // Add choice options
          if (product.choiceOptions.length > 0) {
            await prisma.orderItemChoiceOption.createMany({
              data: product.choiceOptions.slice(0, 1).map((choice) => ({
                orderItemId: orderItem.id,
                choiceOptionId: choice.id,
                name: choice.name,
                price: choice.price,
              })),
            });
          }

          // Add add-ons
          if (product.addOns.length > 0) {
            await prisma.orderItemAddOn.createMany({
              data: product.addOns.slice(0, 1).map((addon) => ({
                orderItemId: orderItem.id,
                addOnId: addon.id,
                name: addon.name,
                price: addon.price,
              })),
            });
          }
        }
      }

      return order;
    }

    // 1. PENDING Order
    await createOrderWithItems('PENDING', -5 * 60 * 1000, {
      subtotal: 19.97,
      tax: 2.0,
      serviceFee: 0.99,
      totalAmount: 22.96,
      note: 'Please make it spicy!',
      estimatedReadyAt: new Date(Date.now() + 25 * 60 * 1000),
    });
    console.log('✅ PENDING order created');

    // 2. CONFIRMED Order
    await createOrderWithItems('CONFIRMED', -15 * 60 * 1000, {
      subtotal: 32.97,
      tax: 3.3,
      serviceFee: 0.99,
      totalAmount: 37.26,
      note: 'Extra cheese on everything',
      confirmedAt: new Date(Date.now() - 14 * 60 * 1000),
      estimatedReadyAt: new Date(Date.now() + 20 * 60 * 1000),
    });
    console.log('✅ CONFIRMED order created');

    // 3. PREPARING Order
    await createOrderWithItems('PREPARING', -20 * 60 * 1000, {
      subtotal: 15.99,
      tax: 1.6,
      serviceFee: 0.99,
      totalAmount: 18.58,
      note: 'No onions please',
      confirmedAt: new Date(Date.now() - 19 * 60 * 1000),
      preparingAt: new Date(Date.now() - 15 * 60 * 1000),
      estimatedReadyAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    console.log('✅ PREPARING order created');

    // 4. READY_FOR_PICKUP Order
    await createOrderWithItems('READY_FOR_PICKUP', -30 * 60 * 1000, {
      subtotal: 28.97,
      tax: 2.9,
      serviceFee: 0.99,
      totalAmount: 32.86,
      note: 'Ready for pickup',
      confirmedAt: new Date(Date.now() - 29 * 60 * 1000),
      preparingAt: new Date(Date.now() - 25 * 60 * 1000),
      readyAt: new Date(Date.now() - 5 * 60 * 1000),
      estimatedReadyAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    console.log('✅ READY_FOR_PICKUP order created');

    // 5. COMPLETED Order (already exists from previous code, but adding another one)
    await createOrderWithItems('COMPLETED', -60 * 60 * 1000, {
      subtotal: 42.97,
      tax: 4.3,
      serviceFee: 0.99,
      totalAmount: 48.26,
      note: 'Delicious food!',
      confirmedAt: new Date(Date.now() - 59 * 60 * 1000),
      preparingAt: new Date(Date.now() - 55 * 60 * 1000),
      readyAt: new Date(Date.now() - 40 * 60 * 1000),
      completedAt: new Date(Date.now() - 30 * 60 * 1000),
      estimatedReadyAt: new Date(Date.now() - 40 * 60 * 1000),
    });
    console.log('✅ COMPLETED order created');

    // 6. CANCELLED Order
    await createOrderWithItems('CANCELLED', -45 * 60 * 1000, {
      subtotal: 12.99,
      tax: 1.3,
      serviceFee: 0.99,
      totalAmount: 15.28,
      note: 'Cancel this order',
      confirmedAt: new Date(Date.now() - 44 * 60 * 1000),
      cancelledAt: new Date(Date.now() - 30 * 60 * 1000),
    });
    console.log('✅ CANCELLED order created');

    // 7. Another PENDING order with different items
    await createOrderWithItems('PENDING', -2 * 60 * 1000, {
      subtotal: 8.99,
      tax: 0.9,
      serviceFee: 0.99,
      totalAmount: 10.88,
      note: 'Quick order',
      estimatedReadyAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    console.log('✅ Another PENDING order created');

    // 8. Another CONFIRMED order with different items
    await createOrderWithItems('CONFIRMED', -10 * 60 * 1000, {
      subtotal: 45.97,
      tax: 4.6,
      serviceFee: 0.99,
      totalAmount: 51.56,
      note: 'Large group order',
      confirmedAt: new Date(Date.now() - 9 * 60 * 1000),
      estimatedReadyAt: new Date(Date.now() + 25 * 60 * 1000),
    });
    console.log('✅ Another CONFIRMED order created');

    console.log('✅ All orders with different statuses created successfully!');
  }

  // ============================================
  // 27. CREATE HELP CENTER TICKETS
  // ============================================
  console.log('📝 Creating help center tickets...');

  if (customer && vendor) {
    await prisma.helpCenterTicket.create({
      data: {
        userId: userIds['user@gmail.com'],
        customerId: customer.id,
        userType: 'CUSTOMER',
        subject: 'Question about delivery time',
        message: 'I was wondering what time the delivery typically arrives?',
        status: 'RESOLVED',
        priority: 'NORMAL',
        adminReply:
          'Our delivery usually arrives within 30-45 minutes. Thank you for your patience!',
        repliedAt: new Date(Date.now() - 30 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 15 * 60 * 1000),
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    await prisma.helpCenterTicket.create({
      data: {
        userId: userIds['vendor@gmail.com'],
        vendorId: vendor.id,
        userType: 'VENDOR',
        subject: 'Menu update request',
        message: 'I would like to update my menu for the summer season.',
        status: 'OPEN',
        priority: 'NORMAL',
        createdAt: new Date(),
      },
    });
    console.log('✅ Help center tickets created');
  }

  // ============================================
  // 28. CREATE VENDOR PROFILE VIEWS
  // ============================================
  console.log('📝 Creating vendor profile views...');

  if (vendor) {
    for (let i = 0; i < 5; i++) {
      await prisma.vendorProfileView.create({
        data: {
          vendorId: vendor.id,
          customerId: customer?.id || undefined,
          viewedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log('✅ Vendor profile views created');
  }

  // ============================================
  // 29. CREATE FOOD REVIEWS
  // ============================================
  console.log('📝 Creating food reviews...');

  if (customer && vendor) {
    const orderItems = await prisma.orderItem.findMany({
      take: 2,
      include: {
        order: true,
      },
    });

    const foodReviewTags = await prisma.foodReviewTag.findMany({
      take: 2,
    });

    for (const item of orderItems) {
      await prisma.foodReview.upsert({
        where: {
          orderItemId: item.id,
        },
        update: {
          rating: 5,
          reviewText: 'Absolutely delicious! Will order again.',
          updatedAt: new Date(),
        },
        create: {
          productId: item.productId,
          customerId: customer.id,
          orderItemId: item.id,
          rating: 5,
          reviewText: 'Absolutely delicious! Will order again.',
          images: {
            create: [
              {
                imageUrl:
                  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=710&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                position: 0,
              },
            ],
          },
          tags: {
            create: foodReviewTags.map((tag) => ({
              tagId: tag.id,
            })),
          },
        },
      });
    }
    console.log('✅ Food reviews created/updated');
  }

  // ============================================
  // 30. CREATE ORDER REPORTS
  // ============================================
  console.log('📝 Creating order reports...');

  if (customer && vendor) {
    const orders = await prisma.order.findMany({
      take: 1,
    });

    for (const order of orders) {
      await prisma.orderReport.create({
        data: {
          orderId: order.id,
          vendorId: order.vendorId,
          customerId: order.customerId,
          reason: 'OTHER',
          description: 'The order arrived with missing items.',
          status: 'RESOLVED',
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          adminNote: 'Refund issued for missing items.',
          images: {
            create: [
              {
                imageUrl:
                  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=710&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                position: 0,
              },
            ],
          },
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log('✅ Order reports created');
  }

  // ============================================
  // 31. CREATE SUBSCRIPTION TRANSACTIONS
  // ============================================
  console.log('📝 Creating subscription transactions...');

  if (vendor) {
    await prisma.subscriptionTransaction.create({
      data: {
        vendorId: vendor.id,
        provider: 'MANUAL',
        productId: 'free_trial',
        amount: 0,
        currency: 'USD',
        purchasedAt: new Date(),
        rawProviderData: {
          type: 'free_trial',
          startDate: new Date().toISOString(),
        },
      },
    });
    console.log('✅ Subscription transactions created');
  }

  console.log('🎉 All seeds completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
