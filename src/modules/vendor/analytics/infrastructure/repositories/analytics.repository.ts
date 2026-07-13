import { Injectable } from '@nestjs/common';
import { IAnalyticsRepository } from '../../domain/interfaces/analytics.repository.interface';
import { AnalyticsCapability } from '../../domain/value-objects/analytics-tier.value-object';
import { AnalyticsSectionData } from '../../domain/entities/analytics.entity';
import { OrderStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getVendorActivePlanCode(vendorId: string): Promise<string | null> {
    const subscription = await this.prisma.vendorSubscription.findUnique({
      where: { vendorId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) return null;
    if (subscription.status !== SubscriptionStatus.ACTIVE) return null;
    if (subscription.expiresAt && subscription.expiresAt < new Date())
      return null;

    return subscription.subscriptionPlan?.code ?? null;
  }

  async getVendorSubscriptionWithPlan(
    vendorId: string,
  ) {
  const vendor = await this.prisma.vendor.findUnique({
    where: { ownerId: vendorId },
    select: {
      id: true,
      ownerId: true,
      businessName: true,
      vendorCode: true,
    },
  });

  if (!vendor) {
    console.log('❌ No vendor found for user:', vendorId);
    return null;
  }

  const subscription = await this.prisma.vendorSubscription.findUnique({
    where: { vendorId: vendor.id },
    include: {
      subscriptionPlan: {
        select: {
          id: true,
          name: true,
          code: true,
          durationDays: true,
          maxProducts: true,
          price: true,
          currency: true,
          revenueCatEntitlementId: true,
        },
      },
    },
  });

  if (!subscription) {
    console.log('ℹ️ No subscription found for vendor:', vendor.id);
    return null;
  }

    return {
      id: subscription.id,
      status: subscription.status,
      isActive: subscription.isActive,
      isTrialPeriod: subscription.isTrialPeriod,
      autoRenew: subscription.autoRenew,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      expiresAt: subscription.expiresAt,
      lastRenewalDate: subscription.lastRenewalDate,
      cancellationDate: subscription.cancellationDate,
      revenueCatAppUserId: subscription.revenueCatAppUserId,
      entitlementId: subscription.entitlementId,
      productId: subscription.productId,
      store: subscription.store,
      provider: subscription.provider,
      subscriptionPlan: subscription.subscriptionPlan
        ? {
            id: subscription.subscriptionPlan.id,
            name: subscription.subscriptionPlan.name,
            code: subscription.subscriptionPlan.code,
            durationDays: subscription.subscriptionPlan.durationDays,
            maxProducts: subscription.subscriptionPlan.maxProducts,
            price: subscription.subscriptionPlan.price,
            currency: subscription.subscriptionPlan.currency,
            revenueCatEntitlementId:
              subscription.subscriptionPlan.revenueCatEntitlementId,
          }
        : null,
    };
  }

  async getSectionData(
    vendorId: string,
    capability: AnalyticsCapability,
    month: string,
  ): Promise<AnalyticsSectionData> {
    const { start, end } = this.monthRange(month);

    switch (capability) {
      case AnalyticsCapability.REVENUE:
        return this.getRevenue(vendorId, start, end);
      case AnalyticsCapability.PEAK_HOURS:
        return this.getPeakHours(vendorId, start, end);
      case AnalyticsCapability.AI_GUIDANCE:
        return this.getAiGuidanceDemo();
      case AnalyticsCapability.ORDER_DISTRIBUTION:
        return this.getOrderDistribution(vendorId, start, end);
      case AnalyticsCapability.CUSTOMER_ENGAGEMENT:
        return this.getCustomerEngagement(vendorId, start, end);
      case AnalyticsCapability.TOP_CONTENT:
        return this.getTopContent(vendorId, start, end);
      case AnalyticsCapability.PROFILE_VIEWS:
        return this.getProfileViews(vendorId, start, end);
      case AnalyticsCapability.AVERAGE_RATING:
        return this.getAverageRating(vendorId);
      case AnalyticsCapability.FAVORITES:
        return this.getFavorites(vendorId);
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unhandled analytics capability: ${capability}`);
    }
  }

  // ---------- section implementations ----------

  private async getRevenue(vendorId: string, start: Date, end: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        vendorId,
        status: OrderStatus.COMPLETED,
        completedAt: { gte: start, lt: end },
      },
      select: { totalAmount: true, completedAt: true },
    });

    const total = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // previous month, for changePercent
    const prevRange = this.monthRange(this.shiftMonth(start, -1));
    const prevOrders = await this.prisma.order.findMany({
      where: {
        vendorId,
        status: OrderStatus.COMPLETED,
        completedAt: { gte: prevRange.start, lt: prevRange.end },
      },
      select: { totalAmount: true },
    });
    const prevTotal = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const changePercent =
      prevTotal === 0 ? 0 : ((total - prevTotal) / prevTotal) * 100;

    const byDay = new Map<number, number>();
    for (const o of orders) {
      const day = o.completedAt!.getDate();
      byDay.set(day, (byDay.get(day) ?? 0) + o.totalAmount);
    }

    return {
      total,
      currency: 'USD',
      changePercent: Math.round(changePercent * 10) / 10,
      series: Array.from(byDay.entries()).map(([day, amount]) => ({
        day,
        amount,
      })),
    };
  }

  private async getPeakHours(vendorId: string, start: Date, end: Date) {
    const orders = await this.prisma.order.findMany({
      where: { vendorId, createdAt: { gte: start, lt: end } },
      select: { createdAt: true },
    });

    const byHour = new Array(24).fill(0);
    for (const o of orders) byHour[o.createdAt.getHours()]++;

    const max = Math.max(...byHour, 1);
    const slots = byHour.map((value, hour) => ({
      time: `${String(hour).padStart(2, '0')}:00`,
      value,
      trafficLevel:
        value >= max * 0.66
          ? ('high' as const)
          : value >= max * 0.33
            ? ('medium' as const)
            : ('low' as const),
    }));

    return { slots };
  }

  /**
   * DEMO DATA — no AI provider wired up yet.
   * Replace this with a real call once you plug in an LLM/analytics API.
   */
  private getAiGuidanceDemo() {
    return {
      isDemoData: true,
      suggestions: [
        {
          title: 'Shift your Friday lunch spot to Downtown Plaza',
          message: 'High demand for Korean Fusion predicted for this Friday.',
          reason:
            'Downtown foot traffic peaks at 12:30 PM this Friday due to a tech conference.',
        },
      ],
    };
  }

  private async getOrderDistribution(vendorId: string, start: Date, end: Date) {
    const orders = await this.prisma.order.findMany({
      where: { vendorId, createdAt: { gte: start, lt: end } },
      select: {
        status: true,
        orderItems: { select: { quantity: true } },
      },
    });

    const totalOrders = orders.length;
    const itemsSold = orders.reduce(
      (sum, o) => sum + o.orderItems.reduce((s, i) => s + i.quantity, 0),
      0,
    );
    const completed = orders.filter(
      (o) => o.status === OrderStatus.COMPLETED,
    ).length;
    const cancelled = orders.filter(
      (o) => o.status === OrderStatus.CANCELLED,
    ).length;

    return {
      totalOrders,
      itemsSold,
      completedPercent:
        totalOrders === 0 ? 0 : Math.round((completed / totalOrders) * 100),
      cancelledPercent:
        totalOrders === 0 ? 0 : Math.round((cancelled / totalOrders) * 100),
    };
  }

  private async getCustomerEngagement(
    vendorId: string,
    start: Date,
    end: Date,
  ) {
    const orders = await this.prisma.order.findMany({
      where: { vendorId, createdAt: { gte: start, lt: end } },
      select: { customerId: true, createdAt: true },
    });

    // customers who ordered from this vendor before `start`
    const priorCustomerIds = new Set(
      (
        await this.prisma.order.findMany({
          where: { vendorId, createdAt: { lt: start } },
          select: { customerId: true },
          distinct: ['customerId'],
        })
      ).map((o) => o.customerId),
    );

    const byDay = new Map<
      number,
      { newC: Set<string>; repeatC: Set<string> }
    >();
    for (const o of orders) {
      const day = o.createdAt.getDate();
      const bucket = byDay.get(day) ?? { newC: new Set(), repeatC: new Set() };
      if (priorCustomerIds.has(o.customerId)) {
        bucket.repeatC.add(o.customerId);
      } else {
        bucket.newC.add(o.customerId);
      }
      byDay.set(day, bucket);
    }

    const uniqueCustomers = new Set(orders.map((o) => o.customerId));
    const repeatCustomers = [...uniqueCustomers].filter((id) =>
      priorCustomerIds.has(id),
    );
    const repeatRatePercent =
      uniqueCustomers.size === 0
        ? 0
        : Math.round((repeatCustomers.length / uniqueCustomers.size) * 100);

    return {
      series: Array.from(byDay.entries()).map(([day, b]) => ({
        day,
        newCustomers: b.newC.size,
        repeatedCustomers: b.repeatC.size,
      })),
      repeatRatePercent,
    };
  }

  private async getTopContent(vendorId: string, start: Date, end: Date) {
    const topDishesRaw = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: { order: { vendorId, createdAt: { gte: start, lt: end } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topDishes = topDishesRaw.map((d) => ({
      productId: d.productId,
      name: d.productName,
      orderCount: d._sum.quantity ?? 0,
    }));

    const topCustomersRaw = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: { vendorId, createdAt: { gte: start, lt: end } },
      _count: { _all: true },
      orderBy: { _count: { customerId: 'desc' } },
      take: 5,
    });

    const customerRecords = await this.prisma.customer.findMany({
      where: { id: { in: topCustomersRaw.map((c) => c.customerId) } },
      include: { user: { select: { name: true } } },
    });
    const customerNameMap = new Map(
      customerRecords.map((c) => [c.id, c.user.name ?? 'Customer']),
    );

    return {
      topDishes,
      topCustomers: topCustomersRaw.map((c) => ({
        customerId: c.customerId,
        name: customerNameMap.get(c.customerId) ?? 'Customer',
        orderCount: c._count._all,
      })),
      topSpots: [], // requires order pickup-location data — add once you track that
      spotlightDish: topDishes[0],
    };
  }

  private async getProfileViews(vendorId: string, start: Date, end: Date) {
    const views = await this.prisma.vendorProfileView.findMany({
      where: { vendorId, viewedAt: { gte: start, lt: end } },
      select: { viewedAt: true },
    });

    const prevRange = this.monthRange(this.shiftMonth(start, -1));
    const prevCount = await this.prisma.vendorProfileView.count({
      where: {
        vendorId,
        viewedAt: { gte: prevRange.start, lt: prevRange.end },
      },
    });

    const total = views.length;
    const changePercent =
      prevCount === 0
        ? 0
        : Math.round(((total - prevCount) / prevCount) * 1000) / 10;

    const byDay = new Map<number, number>();
    for (const v of views) {
      const day = v.viewedAt.getDate();
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }

    return {
      total,
      changePercent,
      series: Array.from(byDay.entries()).map(([day, count]) => ({
        day,
        views: count,
      })),
    };
  }

  private async getAverageRating(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { truckReviewAverage: true, truckReviewCount: true },
    });

    const breakdownRaw = await this.prisma.vendorTruckReview.groupBy({
      by: ['rating'],
      where: { vendorId },
      _count: { _all: true },
    });

    const total = vendor?.truckReviewCount ?? 0;
    const breakdown = [5, 4, 3, 2, 1].map((star) => {
      const found = breakdownRaw.find((b) => b.rating === star);
      const count = found?._count._all ?? 0;
      return {
        star,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      };
    });

    return {
      average: vendor?.truckReviewAverage ?? 0,
      totalReviews: total,
      breakdown,
    };
  }

  private async getFavorites(vendorId: string) {
    const total = await this.prisma.favoriteVendor.count({
      where: { vendorId },
    });
    return {
      totalFavorites: total,
      message: `Congratulations! ${total} people marked you as their favorite truck. Keep it up!`,
    };
  }

  // ---------- helpers ----------

  private monthRange(month: string): { start: Date; end: Date } {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, m - 1, 1));
    const end = new Date(Date.UTC(year, m, 1));
    return { start, end };
  }

  private shiftMonth(date: Date, delta: number): string {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() + delta);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
