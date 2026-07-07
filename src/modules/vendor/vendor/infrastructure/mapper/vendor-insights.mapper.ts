// src/modules/vendor/infrastructure/mapper/vendor-insights.mapper.ts

import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import type {
  VendorInsightProfileView,
  VendorInsightOrderView,
  VendorAiProfileView,
  VendorAiOrderView,
} from '../../domain/interface/vendor.repository.interface';

import {
  VendorInsightsOverviewResponseDto,
  VendorInsightAccessDto,
  VendorRevenuePointDto,
  VendorPeakHourPointDto,
  VendorTopDishDto,
  VendorTopCustomerDto,
  VendorTopSpotDto,
  VendorLockedInsightSectionDto,
  VendorAiGuidanceResponseDto,
  VendorAiSalesByLocationDto,
  VendorAiTopSellingItemDto,
  VendorAiRecommendedActionDto,
  VendorAiLiveHotZoneDto,
  VendorAiOpportunityDto,
} from '../../presentation/dto/vendor-insights.response.dto';

@Injectable()
export class VendorInsightsMapper {
  toOverviewResponse(data: {
    access: VendorInsightAccessDto;
    range: 'today' | 'week' | 'month' | 'year';
    startDate: Date;
    endDate: Date;
    vendor: VendorInsightProfileView;
    orders: VendorInsightOrderView[];
    totalFavorites: number;
    favoritesInRange: number;
  }): VendorInsightsOverviewResponseDto {
    const orders = data.orders;

    const completedOrders = orders.filter(
      (order) => order.status === OrderStatus.COMPLETED,
    );

    const response: VendorInsightsOverviewResponseDto = {
      access: data.access,
      range: data.range,
      startDate: data.startDate,
      endDate: data.endDate,
      emptyState: orders.length === 0,
      lockedSections: this.buildLockedSections(data.access),
    };

    if (data.access.canViewRevenue) {
      response.revenueSummary = {
        label: 'Revenue',
        value: this.sumRevenue(completedOrders),
        changePercent: 0,
        changeLabel: 'This period',
      };

      response.revenueChart = this.buildRevenueChart(
        completedOrders,
        data.startDate,
        data.endDate,
      );
    }

    if (data.access.canViewPeakHours) {
      response.peakHours = this.buildPeakHours(orders);
    }

    if (data.access.canViewProfileViews) {
      response.profileViews = {
        label: 'Profile views',
        value: 0,
        changePercent: 0,
        changeLabel:
          'Profile view tracking schema is required for real view analytics.',
      };
    }

    if (data.access.canViewRatings) {
      response.averageRating = {
        rating: data.vendor.truckReviewAverage,
        reviewCount: data.vendor.truckReviewCount,
      };
    }

    if (data.access.canViewFavorites) {
      response.favorites = {
        label: 'Marked as favorite',
        value: data.totalFavorites,
        changePercent: 0,
        changeLabel: `${data.favoritesInRange} new favorites this period`,
      };
    }

    if (data.access.canViewOrderDistribution) {
      response.orderDistribution = this.buildOrderDistribution(orders);
    }

    if (data.access.canViewCustomerEngagement) {
      response.customerEngagement = this.buildCustomerEngagement(orders);
    }

    if (data.access.canViewTopDishes) {
      response.topDishes = this.buildTopDishes(orders);
    }

    if (data.access.canViewTopCustomers) {
      response.topCustomers = this.buildTopCustomers(orders);
    }

    if (data.access.canViewTopSpots) {
      response.topSpots = this.buildTopSpots();
    }

    return response;
  }

  private sumRevenue(orders: VendorInsightOrderView[]): number {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0);
  }

  private buildRevenueChart(
    orders: VendorInsightOrderView[],
    startDate: Date,
    endDate: Date,
  ): VendorRevenuePointDto[] {
    const points = new Map<string, number>();

    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const label = String(cursor.getDate());
      points.set(label, 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const order of orders) {
      const label = String(new Date(order.createdAt).getDate());
      points.set(label, (points.get(label) ?? 0) + order.totalAmount);
    }

    return Array.from(points.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }

  private buildPeakHours(
    orders: VendorInsightOrderView[],
  ): VendorPeakHourPointDto[] {
    const hourMap = new Map<number, number>();

    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }

    return Array.from(hourMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, orderCount]) => ({
        time: `${String(hour).padStart(2, '0')}:00`,
        orderCount,
        trafficLevel: this.resolveTrafficLevel(orderCount),
      }));
  }

  private resolveTrafficLevel(orderCount: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (orderCount >= 10) return 'HIGH';
    if (orderCount >= 4) return 'MEDIUM';
    return 'LOW';
  }

  private buildOrderDistribution(orders: VendorInsightOrderView[]) {
    const totalOrders = orders.length;

    const completedOrders = orders.filter(
      (order) => order.status === OrderStatus.COMPLETED,
    ).length;

    const cancelledOrders = orders.filter(
      (order) => order.status === OrderStatus.CANCELLED,
    ).length;

    const pendingOrders = orders.filter(
      (order) => order.status === OrderStatus.PENDING,
    ).length;

    const itemsSold = orders.reduce(
      (sum, order) =>
        sum +
        order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      itemsSold,
      completedPercent: totalOrders
        ? Math.round((completedOrders / totalOrders) * 100)
        : 0,
      cancelledPercent: totalOrders
        ? Math.round((cancelledOrders / totalOrders) * 100)
        : 0,
    };
  }

  private buildCustomerEngagement(orders: VendorInsightOrderView[]) {
    const customerOrderMap = new Map<string, number>();

    for (const order of orders) {
      customerOrderMap.set(
        order.customerId,
        (customerOrderMap.get(order.customerId) ?? 0) + 1,
      );
    }

    const totalCustomers = customerOrderMap.size;

    const repeatCustomers = Array.from(customerOrderMap.values()).filter(
      (count) => count > 1,
    ).length;

    const newCustomers = totalCustomers - repeatCustomers;

    return {
      totalCustomers,
      newCustomers,
      repeatCustomers,
      repeatRate: totalCustomers
        ? Math.round((repeatCustomers / totalCustomers) * 100)
        : 0,
    };
  }

  private buildTopDishes(orders: VendorInsightOrderView[]): VendorTopDishDto[] {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        orderCount: number;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.orderItems) {
        const existing = map.get(item.productId) ?? {
          productId: item.productId,
          name: item.productName,
          orderCount: 0,
          quantitySold: 0,
          revenue: 0,
        };

        existing.orderCount += 1;
        existing.quantitySold += item.quantity;
        existing.revenue += item.lineTotal;

        map.set(item.productId, existing);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);
  }

  private buildTopCustomers(
    orders: VendorInsightOrderView[],
  ): VendorTopCustomerDto[] {
    const map = new Map<
      string,
      {
        customerId: string;
        name: string;
        orderCount: number;
        totalSpent: number;
      }
    >();

    for (const order of orders) {
      const name =
        order.customer.user.name ?? order.customer.user.email ?? 'Customer';

      const existing = map.get(order.customerId) ?? {
        customerId: order.customerId,
        name,
        orderCount: 0,
        totalSpent: 0,
      };

      existing.orderCount += 1;
      existing.totalSpent += order.totalAmount;

      map.set(order.customerId, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }

  private buildTopSpots(): VendorTopSpotDto[] {
    return [];
  }

  private buildLockedSections(
    access: VendorInsightAccessDto,
  ): VendorLockedInsightSectionDto[] {
    const sections: VendorLockedInsightSectionDto[] = [];

    if (!access.canViewRevenue) {
      sections.push({
        key: 'REVENUE',
        title: 'Revenue Analytics',
        requiredPlan: 'PRO',
        message: 'Upgrade to Pro to unlock revenue analytics.',
      });
    }

    if (!access.canViewPeakHours) {
      sections.push({
        key: 'PEAK_HOURS',
        title: 'Peak Hours',
        requiredPlan: 'PRO',
        message: 'Upgrade to Pro to see your highest traffic hours.',
      });
    }

    if (!access.canViewOrderDistribution) {
      sections.push({
        key: 'ORDER_DISTRIBUTION',
        title: 'Order Distribution',
        requiredPlan: 'PRO',
        message:
          'Upgrade to Pro to see completed, cancelled, and item sold analytics.',
      });
    }

    if (!access.canViewCustomerEngagement) {
      sections.push({
        key: 'CUSTOMER_ENGAGEMENT',
        title: 'Customer Engagement',
        requiredPlan: 'PRO',
        message: 'Upgrade to Pro to understand new and repeat customers.',
      });
    }

    if (!access.canViewTopDishes) {
      sections.push({
        key: 'TOP_DISHES',
        title: 'Top Dishes',
        requiredPlan: 'PRO',
        message: 'Upgrade to Pro to see your best-selling dishes.',
      });
    }

    if (!access.canViewTopCustomers) {
      sections.push({
        key: 'TOP_CUSTOMERS',
        title: 'Top Customers',
        requiredPlan: 'PRO',
        message: 'Upgrade to Pro to see loyal customer insights.',
      });
    }

    if (!access.canViewTopSpots) {
      sections.push({
        key: 'TOP_SPOTS',
        title: 'Top Spots',
        requiredPlan: 'PRO',
        message:
          'Upgrade to Pro to view top-performing locations. Accurate top spots require location tracking.',
      });
    }

    if (!access.canViewAiGuidance) {
      sections.push({
        key: 'AI_GUIDANCE',
        title: 'AI Guidance',
        requiredPlan: 'ELITE',
        message: 'Upgrade to Elite to unlock AI-powered recommendations.',
      });
    }

    if (!access.canViewEvents) {
      sections.push({
        key: 'EVENTS',
        title: 'Events and Opportunities',
        requiredPlan: 'ELITE',
        message: 'Upgrade to Elite to unlock event intelligence and hot zones.',
      });
    }

    return sections;
  }

  toAiResponse(data: {
    access: VendorInsightAccessDto;
    range: 'today' | 'week' | 'month' | 'year';
    startDate: Date;
    endDate: Date;
    vendor: VendorAiProfileView;
    orders: VendorAiOrderView[];
  }): VendorAiGuidanceResponseDto {
    if (!data.access.canViewAiGuidance) {
      return {
        access: data.access,
        range: data.range,
        startDate: data.startDate,
        endDate: data.endDate,
        locked: true,
        emptyState: true,
        salesByLocation: [],
        topSellingItems: [],
        recommendedActions: [],
        liveHotZones: [],
        todaysOpportunities: [],
        dataAvailability: {
          hasOrderData: false,
          hasLocationData: !!data.vendor.serviceArea,
          hasSearchDemandData: false,
          hasEventData: false,
        },
        lockedMessage:
          'Upgrade to Elite to unlock AI Guidance and optimization tools.',
      };
    }

    const topSellingItems = this.buildTopSellingItems(data.orders);

    return {
      access: data.access,
      range: data.range,
      startDate: data.startDate,
      endDate: data.endDate,
      locked: false,
      emptyState: data.orders.length === 0,

      salesByLocation: this.buildSalesByLocation(data.vendor, data.orders),

      topSellingItems,

      recommendedActions: this.buildRecommendedActions(
        data.orders,
        topSellingItems,
        data.vendor,
      ),

      liveHotZones: this.buildLiveHotZones(data.vendor),

      todaysOpportunities: this.buildTodaysOpportunities(
        data.orders,
        topSellingItems,
        data.vendor,
      ),

      dataAvailability: {
        hasOrderData: data.orders.length > 0,
        hasLocationData: !!data.vendor.serviceArea,
        hasSearchDemandData: false,
        hasEventData: false,
      },
    };
  }

  private buildSalesByLocation(
    vendor: VendorAiProfileView,
    orders: VendorAiOrderView[],
  ): VendorAiSalesByLocationDto[] {
    if (!vendor.serviceArea) {
      return [];
    }

    const totalSales = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    return [
      {
        locationId: vendor.serviceArea.id,
        locationName: vendor.serviceArea.address ?? 'Current Service Area',
        address: vendor.serviceArea.address,
        totalSales,
        totalOrders: orders.length,
        latitude: vendor.serviceArea.latitude,
        longitude: vendor.serviceArea.longitude,
      },
    ];
  }

  private buildTopSellingItems(
    orders: VendorAiOrderView[],
  ): VendorAiTopSellingItemDto[] {
    const map = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantitySold: number;
        orderCount: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.orderItems) {
        const existing = map.get(item.productId) ?? {
          productId: item.productId,
          productName: item.productName,
          quantitySold: 0,
          orderCount: 0,
          revenue: 0,
        };

        existing.quantitySold += item.quantity;
        existing.orderCount += 1;
        existing.revenue += item.lineTotal;

        map.set(item.productId, existing);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 3)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }

  private buildRecommendedActions(
    orders: VendorAiOrderView[],
    topItems: VendorAiTopSellingItemDto[],
    vendor: VendorAiProfileView,
  ): VendorAiRecommendedActionDto[] {
    if (!orders.length || !topItems.length) {
      return [
        {
          title: 'Collect more order data',
          description:
            'Start accepting more orders so ATLISS can generate reliable AI recommendations.',
          actionLabel: 'Keep Selling',
          confidence: 'LOW',
          source: 'ORDER_HISTORY',
        },
      ];
    }

    const peakHour = this.findPeakHour(orders);
    const topItem = topItems[0];

    return [
      {
        title: `Promote ${topItem.productName}`,
        description: `${topItem.productName} is your strongest seller in this period. Promote it around ${peakHour} to capture more demand.`,
        actionLabel: 'Promote Item',
        confidence: 'HIGH',
        source: 'ORDER_ITEM_SALES',
      },
      {
        title: 'Optimize your selling window',
        description: `Your order activity is strongest around ${peakHour}. Keep your truck active and menu available during this time.`,
        actionLabel: 'Adjust Hours',
        confidence: 'MEDIUM',
        source: 'ORDER_TIME_PATTERN',
      },
      {
        title: 'Use your current service area',
        description: vendor.serviceArea
          ? `Your current service area is ${vendor.serviceArea.address ?? 'your saved location'}. More location snapshots are needed for deeper area comparison.`
          : 'Set your service area so ATLISS can recommend better selling locations.',
        actionLabel: vendor.serviceArea ? 'View Location' : 'Set Location',
        confidence: vendor.serviceArea ? 'MEDIUM' : 'LOW',
        source: 'SERVICE_AREA',
      },
    ];
  }

  private buildLiveHotZones(
    vendor: VendorAiProfileView,
  ): VendorAiLiveHotZoneDto[] {
    if (!vendor.serviceArea) {
      return [];
    }

    return [
      {
        title: 'Current Service Area',
        locationName: vendor.serviceArea.address ?? 'Saved Truck Location',
        description:
          'Real-time hot zone detection requires customer search and traffic demand data. Current response is based on your saved service area.',
        estimatedExtraRevenue: undefined,
        confidence: 'LOW',
        isAvailable: false,
      },
    ];
  }

  private buildTodaysOpportunities(
    orders: VendorAiOrderView[],
    topItems: VendorAiTopSellingItemDto[],
    vendor: VendorAiProfileView,
  ): VendorAiOpportunityDto[] {
    if (!orders.length || !topItems.length || !vendor.serviceArea) {
      return [];
    }

    return [
      {
        title: `Lunch push for ${topItems[0].productName}`,
        locationName: vendor.serviceArea.address ?? 'Current Service Area',
        timeWindow: `${this.findPeakHour(orders)} - ${this.addOneHour(
          this.findPeakHour(orders),
        )}`,
        demandLevel: 'MEDIUM',
        actionLabel: 'Go There',
      },
    ];
  }

  private findPeakHour(orders: VendorAiOrderView[]): string {
    const hourMap = new Map<number, number>();

    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }

    const [peakHour] = Array.from(hourMap.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0] ?? [12, 0];

    return `${String(peakHour).padStart(2, '0')}:00`;
  }

  private addOneHour(time: string): string {
    const hour = Number(time.split(':')[0]);
    const nextHour = (hour + 1) % 24;

    return `${String(nextHour).padStart(2, '0')}:00`;
  }
}
