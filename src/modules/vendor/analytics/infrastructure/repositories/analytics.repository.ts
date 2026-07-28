import { Injectable } from '@nestjs/common';
import type {
  IAnalyticsRepository,
  VendorSubscriptionWithPlan,
} from '../../domain/interfaces/analytics.repository.interface';
import { AnalyticsCapability } from '../../domain/value-objects/analytics-tier.value-object';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // GET VENDOR BY USER ID
  // ============================================

  async getVendorByUserId(userId: string): Promise<{ id: string } | null> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: { id: true, businessName: true },
    });

    if (!vendor) {
      return null;
    }

    console.log('✅ [REPO] Vendor found:', vendor.id, vendor.businessName);
    return { id: vendor.id };
  }

  // ============================================
  // GET VENDOR SUBSCRIPTION WITH PLAN
  // ============================================

  async getVendorSubscriptionWithPlan(
    userId: string,
  ): Promise<VendorSubscriptionWithPlan | null> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerId: userId },
      select: {
        id: true,
        ownerId: true,
        businessName: true,
        vendorCode: true,
      },
    });

    if (!vendor) {
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

  // ============================================
  // GET SECTION DATA
  // ============================================

  async getSectionData(
    vendorId: string,
    capability: AnalyticsCapability,
    month: string,
  ): Promise<any> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      return null;
    }

    switch (capability) {
      case AnalyticsCapability.REVENUE:
        return this.getRevenueData(vendorId, startDate, endDate);
      case AnalyticsCapability.PEAK_HOURS:
        return this.getPeakHoursData(vendorId, startDate, endDate);
      case AnalyticsCapability.ORDER_DISTRIBUTION:
        return this.getOrderDistributionData(vendorId, startDate, endDate);
      case AnalyticsCapability.CUSTOMER_ENGAGEMENT:
        return this.getCustomerEngagementData(vendorId, startDate, endDate);
      case AnalyticsCapability.TOP_CONTENT:
        return this.getTopContentData(vendorId, startDate, endDate);
      case AnalyticsCapability.PROFILE_VIEWS:
        return this.getProfileViewsData(vendorId, startDate, endDate);
      case AnalyticsCapability.AVERAGE_RATING:
        return this.getAverageRatingData(vendorId, startDate, endDate);
      case AnalyticsCapability.FAVORITES:
        return this.getFavoritesData(vendorId, startDate, endDate);
      case AnalyticsCapability.AI_GUIDANCE:
        return this.getAIGuidanceData(vendorId, startDate, endDate);
      default:
        return null;
    }
  }

  // ============================================
  // REVENUE DATA
  // ============================================

  private async getRevenueData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const completedOrders = await this.prisma.order.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const total = completedOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    const series: { date: string; value: number }[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyTotal = completedOrders
        .filter(
          (order) => order.createdAt >= dayStart && order.createdAt <= dayEnd,
        )
        .reduce((sum, order) => sum + order.totalAmount, 0);

      series.push({
        date: currentDate.toISOString().split('T')[0],
        value: dailyTotal,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const prevStart = new Date(startDate);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(endDate);
    prevEnd.setMonth(prevEnd.getMonth() - 1);

    const prevOrders = await this.prisma.order.findMany({
      where: {
        vendorId,
        createdAt: { gte: prevStart, lte: prevEnd },
        status: 'COMPLETED',
      },
      select: { totalAmount: true },
    });

    const prevTotal = prevOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const changePercent =
      prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return {
      total,
      currency: 'USD',
      changePercent: Math.round(changePercent * 100) / 100,
      series,
    };
  }

  // ============================================
  // PEAK HOURS DATA
  // ============================================

  private async getPeakHoursData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const hourMap = new Map<number, { value: number; orders: number }>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { value: 0, orders: 0 });
    }

    orders.forEach((order) => {
      const hour = order.createdAt.getHours();
      const data = hourMap.get(hour)!;
      data.value += order.totalAmount;
      data.orders += 1;
    });

    const maxOrders = Math.max(
      ...Array.from(hourMap.values()).map((d) => d.orders),
    );

    const slots = Array.from(hourMap.entries()).map(([hour, data]) => {
      const percentage = maxOrders > 0 ? (data.orders / maxOrders) * 100 : 0;

      let trafficLevel: 'low' | 'mid' | 'high' = 'low';
      if (percentage > 60) trafficLevel = 'high';
      else if (percentage > 30) trafficLevel = 'mid';

      return {
        time: `${String(hour).padStart(2, '0')}:00`,
        value: data.value,
        orders: data.orders,
        trafficLevel,
      };
    });

    return { slots };
  }

  // ============================================
  // ORDER DISTRIBUTION DATA
  // ============================================

  private async getOrderDistributionData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        status: true,
        orderItems: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const totalOrders = orders.length;
    let itemsSold = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        itemsSold += item.quantity;
      });

      if (order.status === 'COMPLETED') completedCount++;
      if (order.status === 'CANCELLED') cancelledCount++;
    });

    const completedPercent =
      totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;
    const cancelledPercent =
      totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

    return {
      totalOrders,
      itemsSold,
      completedPercent: Math.round(completedPercent * 100) / 100,
      cancelledPercent: Math.round(cancelledPercent * 100) / 100,
    };
  }

  // ============================================
  // CUSTOMER ENGAGEMENT DATA
  // ============================================

  private async getCustomerEngagementData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      select: {
        customerId: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    const customerMap = new Map<
      string,
      { orders: number; totalSpent: number; dates: Date[] }
    >();

    orders.forEach((order) => {
      const data = customerMap.get(order.customerId) || {
        orders: 0,
        totalSpent: 0,
        dates: [],
      };
      data.orders += 1;
      data.totalSpent += order.totalAmount;
      data.dates.push(order.createdAt);
      customerMap.set(order.customerId, data);
    });

    const totalCustomers = customerMap.size;
    const repeatCustomers = Array.from(customerMap.values()).filter(
      (c) => c.orders > 1,
    ).length;
    const repeatRatePercent =
      totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    const series: { date: string; value: number }[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyOrders = orders.filter(
        (o) => o.createdAt >= dayStart && o.createdAt <= dayEnd,
      );
      const uniqueCustomers = new Set(dailyOrders.map((o) => o.customerId))
        .size;

      series.push({
        date: currentDate.toISOString().split('T')[0],
        value: uniqueCustomers,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      series,
      repeatRatePercent: Math.round(repeatRatePercent * 100) / 100,
      totalCustomers,
      repeatCustomers,
    };
  }

  // ============================================
  // TOP CONTENT DATA
  // ============================================

  private async getTopContentData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const topDishes = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          vendorId,
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 10,
    });

    const topCustomers = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: { totalAmount: 'desc' },
      },
      take: 10,
    });

    const customerIds = topCustomers.map((c) => c.customerId);
    const customerNames = await this.prisma.customer.findMany({
      where: { userId: { in: customerIds } },
      select: {
        userId: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const topSpots = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: 10,
    });

    return {
      topDishes: topDishes.map((d) => ({
        name: d.productName || 'Unknown',
        orders: d._sum.quantity || 0,
        revenue: d._sum.lineTotal || 0,
      })),
      topCustomers: topCustomers.map((c) => {
        const customer = customerNames.find((cn) => cn.userId === c.customerId);
        return {
          name: customer?.user?.name || 'Anonymous',
          orders: c._count.id || 0,
          spent: c._sum.totalAmount || 0,
        };
      }),
      topSpots: topSpots.map((s) => {
        const customer = customerNames.find((cn) => cn.userId === s.customerId);
        return {
          name: customer?.user?.name || 'Anonymous',
          orders: s._count.id || 0,
        };
      }),
    };
  }

  // ============================================
  // PROFILE VIEWS DATA
  // ============================================

  private async getProfileViewsData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const views = await this.prisma.vendorProfileView.findMany({
      where: {
        vendorId,
        viewedAt: { gte: startDate, lte: endDate },
      },
      select: {
        viewedAt: true,
      },
    });

    const total = views.length;

    const prevStart = new Date(startDate);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(endDate);
    prevEnd.setMonth(prevEnd.getMonth() - 1);

    const prevViews = await this.prisma.vendorProfileView.count({
      where: {
        vendorId,
        viewedAt: { gte: prevStart, lte: prevEnd },
      },
    });

    const changePercent =
      prevViews > 0 ? ((total - prevViews) / prevViews) * 100 : 0;

    const series: { date: string; value: number }[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dailyCount = views.filter(
        (v) => v.viewedAt >= dayStart && v.viewedAt <= dayEnd,
      ).length;

      series.push({
        date: currentDate.toISOString().split('T')[0],
        value: dailyCount,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      total,
      changePercent: Math.round(changePercent * 100) / 100,
      series,
    };
  }

  // ============================================
  // AVERAGE RATING DATA
  // ============================================

  private async getAverageRatingData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const reviews = await this.prisma.vendorTruckReview.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const average =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const breakdown = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => r.rating === star).length;
      const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
      return {
        star,
        percent: Math.round(percent * 100) / 100,
      };
    });

    return {
      average: Math.round(average * 100) / 100,
      totalReviews,
      breakdown,
    };
  }

  // ============================================
  // FAVORITES DATA
  // ============================================

  private async getFavoritesData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const favorites = await this.prisma.favoriteVendor.findMany({
      where: {
        vendorId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalFavorites = favorites.length;

    let message = `Congratulations! ${totalFavorites} people marked you as their favorite truck. Keep it up!`;
    if (totalFavorites === 0) {
      message =
        'Build your fan base! Encourage customers to mark you as their favorite truck.';
    } else if (totalFavorites < 10) {
      message = `Great start! ${totalFavorites} people have marked you as their favorite truck. Keep providing excellent service!`;
    }

    return {
      totalFavorites,
      message,
    };
  }

  // ============================================
  // AI GUIDANCE DATA
  // ============================================

  private async getAIGuidanceData(
    vendorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const [revenue, peakHours, orders, reviews] = await Promise.all([
      this.getRevenueData(vendorId, startDate, endDate),
      this.getPeakHoursData(vendorId, startDate, endDate),
      this.prisma.order.count({
        where: {
          vendorId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.vendorTruckReview.count({
        where: {
          vendorId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    const suggestions: Array<{
      title: string;
      message: string;
      reason: string;
    }> = [];

    if (orders === 0 && reviews === 0 && revenue.total === 0) {
      return {
        isDemoData: true,
        suggestions: [
          {
            title: 'Shift your Friday lunch spot to Downtown Plaza',
            message: 'High demand for Korean Fusion predicted for this Friday.',
            reason:
              'Downtown foot traffic peaks at 12:30 PM this Friday due to a tech conference.',
          },
          {
            title: 'Add a new item: Korean Fried Chicken',
            message:
              'Customers in your area are searching for Korean Fried Chicken.',
            reason: 'Based on search trends and competitor analysis.',
          },
          {
            title: 'Optimize your lunch menu',
            message: 'Customers prefer quick bites during lunch hours.',
            reason:
              'Analysis of local food trends shows high demand for fast, portable meals.',
          },
        ],
      };
    }

    if (revenue.total > 0) {
      suggestions.push({
        title:
          revenue.changePercent > 0
            ? 'Revenue Growth Detected'
            : 'Revenue Analysis',
        message: `Your revenue for this period is $${revenue.total.toFixed(2)}. ${
          revenue.changePercent > 0
            ? `That's a ${revenue.changePercent.toFixed(1)}% increase from last month! Great job!`
            : `Consider running promotional offers to boost sales.`
        }`,
        reason: `Based on ${revenue.series.length} days of data analysis.`,
      });
    }

    const highTrafficSlots =
      peakHours.slots?.filter((s) => s.trafficLevel === 'high') || [];
    if (highTrafficSlots.length > 0) {
      const topSlot = highTrafficSlots[0];
      suggestions.push({
        title: '⏰ Optimize Peak Hours',
        message: `Your busiest time is ${topSlot.time}. Consider adding extra staff during these hours to maximize efficiency.`,
        reason: `Analysis of ${orders} orders shows peak demand at ${topSlot.time}.`,
      });
    }

    if (orders > 0) {
      suggestions.push({
        title:
          orders > 50 ? '🔥 Strong Order Volume' : '📦 Order Volume Analysis',
        message:
          orders > 50
            ? `You have ${orders} orders this month. Great volume! Keep up the good work by maintaining quality and service.`
            : `You have ${orders} orders this month. Consider running promotions or adding new items to increase order volume.`,
        reason: `Based on ${orders} orders in the current period.`,
      });
    }

    if (reviews > 0) {
      suggestions.push({
        title: '⭐ Customer Feedback',
        message: `You have ${reviews} reviews this month. ${
          reviews > 10
            ? 'Great engagement! Keep encouraging customers to leave reviews.'
            : 'Encourage more customers to leave reviews to build your reputation.'
        }`,
        reason: `Based on ${reviews} reviews in the current period.`,
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        title: '🚀 Get Started with AI Guidance',
        message:
          'Complete more orders and engage with customers to unlock personalized AI insights about your business.',
        reason:
          'AI guidance requires sufficient order and customer data to provide meaningful insights.',
      });
    }

    return {
      isDemoData: false,
      suggestions,
    };
  }
}
