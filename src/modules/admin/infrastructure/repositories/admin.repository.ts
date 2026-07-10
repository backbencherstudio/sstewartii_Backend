/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import {
  Prisma,
  VerificationStatus,
  KycStatus,
  SubscriptionStatus,
  VendorLiveStatus,
  OrderStatus,
  VendorVerification,
  Vendor,
  VendorAdminStatus,
} from '@prisma/client';

import type {
  FindVendorVerificationsInput,
  IAdminVendorVerificationRepository,
  VendorVerificationListResult,
  VendorVerificationStatsResult,
  AdminDashboardOverviewRaw,
  RevenueSubscriptionRow,
  SalesOrderRow,
  FindAdminVendorAccountsInput,
  AdminVendorAccountListResult,
  AdminVendorAccountStatsResult,
  AdminVendorOverviewOrderRow,
  AdminVendorOverviewProfileViewRow,
  AdminVendorOverviewFavoriteRow,
  FindAdminVendorAccountOrdersInput,
  AdminVendorAccountOrdersResult,
} from '../../domain/interface/admin.repository.interface';

import { AnalyticsSummaryRawData } from '../mapper/admin-analytics.mapper';

import {
  VendorVerificationSort,
  AdminVendorAccountSort,
  AdminVendorOrderStatusFilter,
  AdminVendorOrderSort,
} from '../../presentation/dto/admin.dto';

export type VendorSubscriptionWithPlan = Prisma.VendorSubscriptionGetPayload<{
  include: { subscriptionPlan: true };
}>;

type UpdateVendorStatusData = {
  adminStatus: VendorAdminStatus;
  statusReason?: string | null;
  suspendedAt?: Date | null;
  disabledAt?: Date | null;
};

@Injectable()
export class AdminVendorVerificationRepository implements IAdminVendorVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManagementList(
    input: FindVendorVerificationsInput,
  ): Promise<VendorVerificationListResult> {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;

    const where = {
      ...(input.status && {
        status: input.status,
      }),
    };

    const orderBy =
      input.sort === VendorVerificationSort.OLDEST
        ? { submittedAt: 'asc' as const }
        : { submittedAt: 'desc' as const };

    const [total, items] = await Promise.all([
      this.prisma.vendorVerification.count({
        where,
      }),

      this.prisma.vendorVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          businessLicense: true,
          healthPermit: true,
          insuranceProof: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          rejectionReason: true,

          vendor: {
            select: {
              id: true,
              businessName: true,
              publicEmail: true,
              contactNumber: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      items,
    };
  }

  async getManagementStats(): Promise<VendorVerificationStatsResult> {
    const [
      totalPending,
      rejectedVerifications,
      totalVerifications,
      reviewedVerifications,
    ] = await Promise.all([
      this.prisma.vendorVerification.count({
        where: {
          status: VerificationStatus.PENDING,
        },
      }),

      this.prisma.vendorVerification.count({
        where: {
          status: VerificationStatus.REJECTED,
        },
      }),

      this.prisma.vendorVerification.count(),

      this.prisma.vendorVerification.findMany({
        where: {
          reviewedAt: {
            not: null,
          },
        },
        select: {
          submittedAt: true,
          reviewedAt: true,
        },
      }),
    ]);

    const totalReviewDays = reviewedVerifications.reduce((sum, item) => {
      if (!item.reviewedAt) return sum;

      const diffMs = item.reviewedAt.getTime() - item.submittedAt.getTime();

      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      return sum + diffDays;
    }, 0);

    const avgReviewTimeDays =
      reviewedVerifications.length > 0
        ? Number((totalReviewDays / reviewedVerifications.length).toFixed(1))
        : 0;

    const rejectionRate =
      totalVerifications > 0
        ? Number(
            ((rejectedVerifications / totalVerifications) * 100).toFixed(1),
          )
        : 0;

    return {
      totalPending,
      rejectedVerifications,
      avgReviewTimeDays,
      rejectionRate,
    };
  }

  async findDetailById(verificationId: string): Promise<any | null> {
    return this.prisma.vendorVerification.findUnique({
      where: {
        id: verificationId,
      },
      select: {
        id: true,
        businessLicense: true,
        healthPermit: true,
        insuranceProof: true,

        status: true,
        rejectionReason: true,
        submittedAt: true,
        reviewedAt: true,

        vendor: {
          select: {
            id: true,
            businessName: true,
            publicEmail: true,
            contactNumber: true,
            coverImage: true,
            createdAt: true,

            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findDocumentFileByVerificationId(
    verificationId: string,
  ): Promise<any | null> {
    return this.prisma.vendorVerification.findUnique({
      where: {
        id: verificationId,
      },
      select: {
        id: true,
        businessLicense: true,
        healthPermit: true,
        insuranceProof: true,

        vendor: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async getOverview(): Promise<AdminDashboardOverviewRaw> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalVendors,
      totalCustomers,
      activeTrucksToday,
      pendingVerifications,
      rejectedVerifications,
      approvedVerifications,
      expiredSubscriptions,
      inactiveVendors,
      pendingOnboarding,
      activeSubscriptions,
      todaySubscriptions,
      totalVerificationCount,
    ] = await Promise.all([
      this.prisma.vendor.count(),
      this.prisma.customer.count(),
      this.prisma.vendor.count({
        where: {
          status: VendorLiveStatus.ONLINE,
        },
      }),
      this.prisma.vendorVerification.count({
        where: {
          status: VerificationStatus.PENDING,
        },
      }),
      this.prisma.vendorVerification.count({
        where: {
          status: VerificationStatus.REJECTED,
        },
      }),
      this.prisma.vendorVerification.count({
        where: {
          status: VerificationStatus.APPROVED,
        },
      }),
      this.prisma.vendorSubscription.count({
        where: {
          status: SubscriptionStatus.EXPIRED,
        },
      }),
      // Inactive vendors - those without active subscription
      this.prisma.vendor.count({
        where: {
          vendorSubscription: {
            is: null,
          },
        },
      }),
      this.prisma.vendor.count({
        where: {
          OR: [
            {
              onboardingStep: {
                lt: 4,
              },
            },
            {
              kycStatus: {
                in: [KycStatus.UNVERIFIED, KycStatus.PENDING_REVIEW],
              },
            },
          ],
        },
      }),
      this.prisma.vendorSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
        include: {
          subscriptionPlan: {
            select: {
              price: true,
              currency: true,
            },
          },
        },
      }),
      this.prisma.vendorSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        include: {
          subscriptionPlan: {
            select: {
              price: true,
              currency: true,
            },
          },
        },
      }),
      this.prisma.vendorVerification.count(),
    ]);

    const currency =
      activeSubscriptions[0]?.subscriptionPlan?.currency ??
      todaySubscriptions[0]?.subscriptionPlan?.currency ??
      'USD';

    const platformRevenue = activeSubscriptions.reduce((sum, item) => {
      return sum + (item.subscriptionPlan?.price ?? 0);
    }, 0);

    const todayRevenue = todaySubscriptions.reduce((sum, item) => {
      return sum + (item.subscriptionPlan?.price ?? 0);
    }, 0);

    const suspended = await this.prisma.vendor.count({
      where: {
        vendorSubscription: {
          status: SubscriptionStatus.CANCELLED,
        },
      },
    });

    const verified = approvedVerifications;
    const pending = pendingVerifications;
    const rejected = rejectedVerifications;
    const expired = expiredSubscriptions;

    return {
      totalVendors,
      totalCustomers,
      activeTrucksToday,
      platformRevenue,
      todayRevenue,
      currency,
      issuesNeedAttention: pendingVerifications + expiredSubscriptions,
      pendingOnboarding,
      inactiveVendors,
      vendorsByStatus: {
        pending,
        verified,
        expired,
        suspended,
        rejected,
        total: totalVendors || totalVerificationCount,
      },
    };
  }

  async findSubscriptionRevenueRows(
    startDate: Date,
  ): Promise<RevenueSubscriptionRow[]> {
    return this.prisma.vendorSubscription.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        subscriptionPlanId: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        subscriptionPlan: {
          select: {
            price: true,
            currency: true,
          },
        },
      },
    });
  }

  async findSalesRows(startDate: Date): Promise<SalesOrderRow[]> {
    return this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.COMPLETED,
          ],
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });
  }

  async findVerificationForDecision(
    verificationId: string,
  ): Promise<any | null> {
    return this.prisma.vendorVerification.findUnique({
      where: {
        id: verificationId,
      },
      select: {
        id: true,
        vendorId: true,
        businessLicense: true,
        healthPermit: true,
        insuranceProof: true,
        status: true,
        reviewedAt: true,
        rejectionReason: true,
        vendor: {
          select: {
            id: true,
            kycStatus: true,
          },
        },
      },
    });
  }

  async approveVerification(verificationId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.vendorVerification.update({
        where: {
          id: verificationId,
        },
        data: {
          status: VerificationStatus.APPROVED,
          rejectionReason: null,
          reviewedAt: new Date(),
        },
        select: {
          id: true,
          vendorId: true,
          status: true,
          reviewedAt: true,
        },
      });

      await tx.vendor.update({
        where: {
          id: verification.vendorId,
        },
        data: {
          kycStatus: KycStatus.APPROVED,
        },
      });

      return verification;
    });
  }

  async rejectVerification(verificationId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const verification = await tx.vendorVerification.update({
        where: {
          id: verificationId,
        },
        data: {
          status: VerificationStatus.REJECTED,
          rejectionReason: null,
          reviewedAt: new Date(),
        },
        select: {
          id: true,
          vendorId: true,
          status: true,
          reviewedAt: true,
        },
      });

      await tx.vendor.update({
        where: {
          id: verification.vendorId,
        },
        data: {
          kycStatus: KycStatus.REJECTED,
        },
      });

      return verification;
    });
  }

  async findVendorAccounts(
    input: FindAdminVendorAccountsInput,
  ): Promise<AdminVendorAccountListResult> {
    const skip = (input.page - 1) * input.limit;

    const search = input.search?.trim();

    const where: Prisma.VendorWhereInput = {
      ...(input.status && {
        kycStatus: input.status,
      }),
      ...(input.subscriptionStatus && {
        vendorSubscription: {
          status: input.subscriptionStatus,
        },
      }),
      ...(search && {
        OR: [
          {
            vendorCode: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            id: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            businessName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            publicEmail: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            contactNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            owner: {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
          {
            owner: {
              email: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        ],
      }),
    };

    const orderBy = this.resolveOrderBy(input.sort);

    const [total, items] = await Promise.all([
      this.prisma.vendor.count({
        where,
      }),
      this.prisma.vendor.findMany({
        where,
        skip,
        take: input.limit,
        orderBy,
        select: {
          id: true,
          vendorCode: true,
          businessName: true,
          publicEmail: true,
          contactNumber: true,
          kycStatus: true,
          createdAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          vendorSubscription: {
            select: {
              id: true,
              status: true,
              expiresAt: true,
              provider: true,
              store: true,
              productId: true,
              currentPeriodEnd: true,
              subscriptionPlan: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  price: true,
                  currency: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Transform items to match expected format
    const transformedItems = items.map((item) => ({
      ...item,
      subscriptionStatus: item.vendorSubscription?.status || null,
      subscriptionExpiry: item.vendorSubscription?.expiresAt || null,
      subscriptionPlan: item.vendorSubscription?.subscriptionPlan || null,
      subscription: item.vendorSubscription,
    }));

    return {
      total,
      items: transformedItems,
    };
  }

  async getVendorAccountStats(): Promise<AdminVendorAccountStatsResult> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalVendors, verifiedVendors, newThisMonth, suspendedVendors] =
      await Promise.all([
        this.prisma.vendor.count(),

        this.prisma.vendor.count({
          where: {
            kycStatus: KycStatus.APPROVED,
          },
        }),

        this.prisma.vendor.count({
          where: {
            createdAt: {
              gte: startOfMonth,
            },
          },
        }),

        // Fix: Use vendorSubscription relation to find cancelled subscriptions
        this.prisma.vendor.count({
          where: {
            vendorSubscription: {
              status: SubscriptionStatus.CANCELLED,
            },
          },
        }),
      ]);

    return {
      totalVendors,
      verifiedVendors,
      newThisMonth,
      suspendedVendors,
    };
  }

  private resolveOrderBy(
    sort: AdminVendorAccountSort,
  ): Prisma.VendorOrderByWithRelationInput[] {
    switch (sort) {
      case AdminVendorAccountSort.OLDEST:
        return [
          {
            createdAt: 'asc',
          },
        ];

      case AdminVendorAccountSort.NAME_ASC:
        return [
          {
            businessName: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ];

      case AdminVendorAccountSort.NAME_DESC:
        return [
          {
            businessName: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ];

      case AdminVendorAccountSort.NEWEST:
      default:
        return [
          {
            createdAt: 'desc',
          },
        ];
    }
  }

  async findVendorOverviewById(vendorId: string): Promise<any | null> {
    return this.prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      select: {
        id: true,
        vendorCode: true,
        businessName: true,
        publicEmail: true,
        contactNumber: true,
        bio: true,
        coverImage: true,
        status: true,
        kycStatus: true,
        truckReviewAverage: true,
        truckReviewCount: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        vendorSubscription: {
          select: {
            id: true,
            status: true,
            expiresAt: true,
            provider: true,
            store: true,
            productId: true,
            currentPeriodEnd: true,
            subscriptionPlan: {
              select: {
                id: true,
                name: true,
                code: true,
                price: true,
                currency: true,
                maxProducts: true,
              },
            },
          },
        },
        cuisines: {
          include: {
            cuisine: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        socialLinks: {
          select: {
            id: true,
            url: true,
          },
        },
        serviceArea: {
          select: {
            address: true,
            latitude: true,
            longitude: true,
            radius: true,
          },
        },
      },
    });
  }

  async findVendorOrdersForOverview(data: {
    vendorId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<AdminVendorOverviewOrderRow[]> {
    return this.prisma.order.findMany({
      where: {
        vendorId: data.vendorId,
        createdAt: {
          gte: data.startDate,
          lte: data.endDate,
        },
      },
      select: {
        id: true,
        customerId: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        orderItems: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findVendorAllCompletedOrders(
    vendorId: string,
  ): Promise<{ totalAmount: number }[]> {
    return this.prisma.order.findMany({
      where: {
        vendorId,
        status: OrderStatus.COMPLETED,
      },
      select: {
        totalAmount: true,
      },
    });
  }

  async findVendorProfileViewsForOverview(data: {
    vendorId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<AdminVendorOverviewProfileViewRow[]> {
    return this.prisma.vendorProfileView.findMany({
      where: {
        vendorId: data.vendorId,
        viewedAt: {
          gte: data.startDate,
          lte: data.endDate,
        },
      },
      select: {
        viewedAt: true,
      },
      orderBy: {
        viewedAt: 'asc',
      },
    });
  }

  async countVendorProfileViewsInRange(data: {
    vendorId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<number> {
    return this.prisma.vendorProfileView.count({
      where: {
        vendorId: data.vendorId,
        viewedAt: {
          gte: data.startDate,
          lte: data.endDate,
        },
      },
    });
  }

  async countVendorFavorites(vendorId: string): Promise<number> {
    return this.prisma.favoriteVendor.count({
      where: {
        vendorId,
      },
    });
  }

  async findRecentVendorFavorites(data: {
    vendorId: string;
    limit: number;
  }): Promise<AdminVendorOverviewFavoriteRow[]> {
    return this.prisma.favoriteVendor.findMany({
      where: {
        vendorId: data.vendorId,
      },
      take: data.limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
        customer: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findFavoriteCustomerOrderSummaries(data: {
    vendorId: string;
    customerIds: string[];
  }): Promise<
    {
      customerId: string;
      orderCount: number;
      totalSpent: number;
    }[]
  > {
    if (!data.customerIds.length) {
      return [];
    }

    const grouped = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        vendorId: data.vendorId,
        customerId: {
          in: data.customerIds,
        },
        status: OrderStatus.COMPLETED,
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    return grouped.map((item) => ({
      customerId: item.customerId,
      orderCount: item._count.id,
      totalSpent: item._sum.totalAmount ?? 0,
    }));
  }

  async findVendorAccountOrders(
    input: FindAdminVendorAccountOrdersInput,
  ): Promise<AdminVendorAccountOrdersResult> {
    const page = input.page;
    const limit = input.limit;
    const skip = (page - 1) * limit;

    const search = input.search?.trim();

    const where: Prisma.OrderWhereInput = {
      vendorId: input.vendorId,
    };

    if (input.status && input.status !== AdminVendorOrderStatusFilter.ALL) {
      where.status = input.status;
    }

    if (search) {
      where.OR = [
        {
          orderNumber: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          customer: {
            user: {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          customer: {
            user: {
              email: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
      ];
    }

    const orderBy = this.resolveVendorAccountOrderSort(input.sort);

    const [total, items] = await Promise.all([
      this.prisma.order.count({
        where,
      }),

      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,

          customer: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      items,
    };
  }

  private resolveVendorAccountOrderSort(
    sort: AdminVendorOrderSort,
  ): Prisma.OrderOrderByWithRelationInput[] {
    switch (sort) {
      case AdminVendorOrderSort.OLDEST:
        return [
          {
            createdAt: 'asc',
          },
        ];

      case AdminVendorOrderSort.AMOUNT_HIGH:
        return [
          {
            totalAmount: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ];

      case AdminVendorOrderSort.AMOUNT_LOW:
        return [
          {
            totalAmount: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ];

      case AdminVendorOrderSort.NEWEST:
      default:
        return [
          {
            createdAt: 'desc',
          },
        ];
    }
  }

  async findVendorDocuments(
    vendorId: string,
  ): Promise<VendorVerification | null> {
    return this.prisma.vendorVerification.findUnique({
      where: { vendorId },
    });
  }

  async findSubscriptionByVendorId(
    vendorId: string,
  ): Promise<VendorSubscriptionWithPlan | null> {
    return this.prisma.vendorSubscription.findUnique({
      where: { vendorId },
      include: {
        subscriptionPlan: true,
      },
    });
  }

  async updateStatus(
    vendorId: string,
    data: UpdateVendorStatusData,
  ): Promise<Vendor> {
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data,
    });
  }

  async getAnalyticalSummary(): Promise<AnalyticsSummaryRawData> {
    const [totalVendors, totalCustomers, totalSubscribers, revenueAggregate] =
      await Promise.all([
        this.prisma.vendor.count(),

        this.prisma.customer.count(),

        this.prisma.vendorSubscription.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),

        this.prisma.subscriptionTransaction.aggregate({
          _sum: { amount: true },
        }),
      ]);

    return {
      totalVendors,
      totalCustomers,
      totalSubscribers,
      platformRevenue: revenueAggregate._sum.amount ?? 0,
    };
  }
}
