import { 
  Inject, 
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
 } from '@nestjs/common';

import { 
  VerificationStatus,
  OrderStatus,
  VendorAdminStatus,
} from '@prisma/client';

import type { 
  IAdminVendorVerificationRepository,
  RevenueSubscriptionRow,
  SalesOrderRow,
  AdminVendorOverviewOrderRow,
  AdminVendorOverviewProfileViewRow,
 } from '../domain/interface/admin.repository.interface';

import { 
  VendorVerificationListQueryDto,
  VendorVerificationSort,
  AdminVendorVerificationDocumentType,
  AdminDashboardOverviewQueryDto,
  AdminDashboardRevenueQueryDto,
  DashboardRevenueRange,
  DashboardRevenueMetric,
  AdminVendorAccountListQueryDto,
  AdminVendorAccountSort,
  AdminVendorAccountOverviewQueryDto,
  AdminVendorOverviewRange,
  AdminVendorAccountOrdersQueryDto,
  AdminVendorOrderStatusFilter,
  AdminVendorOrderSort,
 } from '../presentation/dto/admin.dto';
import { 
  VendorVerificationManagementResponseDto,
  AdminVendorVerificationDetailResponseDto,
  AdminVendorVerificationFileResponseDto,
  AdminDashboardOverviewResponseDto,
  AdminDashboardRevenueResponseDto,
  AdminVendorVerificationActionResponseDto,
  AdminVendorAccountListResponseDto,
  AdminVendorAccountOverviewResponseDto,
  AdminVendorAccountOrdersResponseDto,
  AdminVendorDocumentsResponseDto,
  AdminVendorSubscriptionResponseDto,
 } from '../presentation/dto/admin.response.dto';
import { AdminMapper } from '../infrastructure/mapper/admin.mapper';

import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';

export interface RevenueChartItem {
  label: string;
  value: number;
}

type DateBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

@Injectable()
export class AdminVendorVerificationService {
  constructor(
    @Inject('IAdminVendorVerificationRepository')
    private readonly repository: IAdminVendorVerificationRepository,
    private readonly adminMapper: AdminMapper,
    private readonly vendorService: VendorService,
  ) {}

  async getManagementList(
    query: VendorVerificationListQueryDto,
  ): Promise<VendorVerificationManagementResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status ?? VerificationStatus.PENDING;
    const sort = query.sort ?? VendorVerificationSort.NEWEST;

    const [stats, result] = await Promise.all([
      this.repository.getManagementStats(),
      this.repository.findManagementList({
        status,
        page,
        limit,
        sort,
      }),
    ]);

    return this.adminMapper.toManagementResponse({
      stats,
      result,
      page,
      limit,
    });
  }

  async getVerificationDetail(
    verificationId: string,
  ): Promise<AdminVendorVerificationDetailResponseDto> {
    const verification =
      await this.repository.findDetailById(verificationId);

    if (!verification) {
      throw new NotFoundException('Vendor verification not found');
    }

    return this.adminMapper.toDetailResponse(verification);
  }

  async getVerificationDocumentFile(
    verificationId: string,
    documentType: AdminVendorVerificationDocumentType,
  ): Promise<AdminVendorVerificationFileResponseDto> {
    const verification =
      await this.repository.findDocumentFileByVerificationId(verificationId);

    if (!verification) {
      throw new NotFoundException('Vendor verification not found');
    }

    return this.adminMapper.toFileResponse({
      verification,
      documentType,
    });
  }

  async getOverview(
    query: AdminDashboardOverviewQueryDto,
  ): Promise<AdminDashboardOverviewResponseDto> {
  
    void query;

    const overview = await this.repository.getOverview();

    return this.adminMapper.toOverviewResponse(overview);
  }

  async getRevenueChart(
    query: AdminDashboardRevenueQueryDto,
  ): Promise<AdminDashboardRevenueResponseDto> {
    const range = query.range ?? DashboardRevenueRange.YEAR;
    const metric = query.metric ?? DashboardRevenueMetric.REVENUE;

    const { startDate, buckets } = this.buildDateBuckets(range);

    if (metric === DashboardRevenueMetric.SALES) {
      const orders = await this.repository.findSalesRows(startDate);

      const items = this.calculateSalesChartItems({
        rows: orders,
        buckets,
      });

      const total = this.calculateTotal(items);

      return this.adminMapper.toRevenueResponse({
        range,
        metric,
        currency: 'USD',
        total,
        items,
      });
    }

    const subscriptions =
      await this.repository.findSubscriptionRevenueRows(startDate);

    const items = this.calculateSubscriptionRevenueChartItems({
      rows: subscriptions,
      buckets,
    });

    const total = this.calculateTotal(items);

    const currency = this.resolveSubscriptionCurrency(subscriptions);

    return this.adminMapper.toRevenueResponse({
      range,
      metric,
      currency,
      total,
      items,
    });
  }

  private calculateSubscriptionRevenueChartItems(data: {
    rows: RevenueSubscriptionRow[];
    buckets: DateBucket[];
  }): RevenueChartItem[] {
    const bucketMap = this.createEmptyBucketMap(data.buckets);

    for (const row of data.rows) {
      const bucket = this.findBucketForDate(row.createdAt, data.buckets);

      if (!bucket) {
        continue;
      }

      const amount = row.subscriptionPlan?.price ?? 0;

      bucketMap.set(bucket.key, (bucketMap.get(bucket.key) ?? 0) + amount);
    }

    return this.mapBucketsToChartItems(data.buckets, bucketMap);
  }

  private calculateSalesChartItems(data: {
    rows: SalesOrderRow[];
    buckets: DateBucket[];
  }): RevenueChartItem[] {
    const bucketMap = this.createEmptyBucketMap(data.buckets);

    for (const row of data.rows) {
      const bucket = this.findBucketForDate(row.createdAt, data.buckets);

      if (!bucket) {
        continue;
      }

      bucketMap.set(
        bucket.key,
        (bucketMap.get(bucket.key) ?? 0) + row.totalAmount,
      );
    }

    return this.mapBucketsToChartItems(data.buckets, bucketMap);
  }

  private createEmptyBucketMap(buckets: DateBucket[]): Map<string, number> {
    const bucketMap = new Map<string, number>();

    for (const bucket of buckets) {
      bucketMap.set(bucket.key, 0);
    }

    return bucketMap;
  }

  private findBucketForDate(
    date: Date,
    buckets: DateBucket[],
  ): DateBucket | undefined {
    return buckets.find((bucket) => date >= bucket.start && date <= bucket.end);
  }

  private mapBucketsToChartItems(
    buckets: DateBucket[],
    bucketMap: Map<string, number>,
  ): RevenueChartItem[] {
    return buckets.map((bucket) => ({
      label: bucket.label,
      value: Number((bucketMap.get(bucket.key) ?? 0).toFixed(2)),
    }));
  }

  private calculateTotal(items: RevenueChartItem[]): number {
    const total = items.reduce((sum, item) => sum + item.value, 0);

    return Number(total.toFixed(2));
  }

  private resolveSubscriptionCurrency(
    rows: RevenueSubscriptionRow[],
  ): string {
    return rows.find((row) => row.subscriptionPlan?.currency)?.subscriptionPlan
      ?.currency ?? 'USD';
  }

  private buildDateBuckets(range: DashboardRevenueRange): {
    startDate: Date;
    buckets: DateBucket[];
  } {
    const now = new Date();

    if (range === DashboardRevenueRange.WEEK) {
      return this.buildWeeklyBuckets(now);
    }

    if (range === DashboardRevenueRange.MONTH) {
      return this.buildMonthlyDailyBuckets(now);
    }

    return this.buildYearlyMonthlyBuckets(now);
  }

  private buildWeeklyBuckets(now: Date): {
    startDate: Date;
    buckets: DateBucket[];
  } {
    const buckets: DateBucket[] = [];

    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const start = new Date(startDate);
      start.setDate(startDate.getDate() + i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
        }).format(start),
        start,
        end,
      });
    }

    return {
      startDate,
      buckets,
    };
  }

  private buildMonthlyDailyBuckets(now: Date): {
    startDate: Date;
    buckets: DateBucket[];
  } {
    const year = now.getFullYear();
    const month = now.getMonth();

    const startDate = new Date(year, month, 1);
    startDate.setHours(0, 0, 0, 0);

    const lastDay = new Date(year, month + 1, 0).getDate();

    const buckets: DateBucket[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const start = new Date(year, month, day);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: String(day),
        start,
        end,
      });
    }

    return {
      startDate,
      buckets,
    };
  }

  private buildYearlyMonthlyBuckets(now: Date): {
    startDate: Date;
    buckets: DateBucket[];
  } {
    const year = now.getFullYear();

    const startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);

    const buckets: DateBucket[] = [];

    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);

      buckets.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: new Intl.DateTimeFormat('en-US', {
          month: 'short',
        }).format(start),
        start,
        end,
      });
    }

    return {
      startDate,
      buckets,
    };
  }

  async approveVendorVerification(
    verificationId: string,
  ): Promise<AdminVendorVerificationActionResponseDto> {
    const verification =
      await this.repository.findVerificationForDecision(verificationId);

    if (!verification) {
      throw new NotFoundException('Vendor verification not found');
    }

    if (verification.status === VerificationStatus.APPROVED) {
      throw new ConflictException(
        'Vendor verification is already approved',
      );
    }

    if (verification.status === VerificationStatus.REJECTED) {
      throw new BadRequestException(
        'Rejected verification cannot be approved. Vendor must resubmit documents.',
      );
    }

    if (
      verification.status !== VerificationStatus.PENDING &&
      verification.status !== VerificationStatus.IN_REVIEW
    ) {
      throw new BadRequestException(
        'Vendor verification cannot be approved from current status',
      );
    }

    if (
      !verification.businessLicense ||
      !verification.healthPermit ||
      !verification.insuranceProof
    ) {
      throw new BadRequestException(
        'All required verification documents must be uploaded before approval',
      );
    }

    const approved =
      await this.repository.approveVerification(verificationId);

    return this.adminMapper.toActionResponse({
      verification: approved,
      message: 'Vendor verification approved successfully.',
    });
  }

  async getVendorAccounts(
    query: AdminVendorAccountListQueryDto,
  ): Promise<AdminVendorAccountListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sort = query.sort ?? AdminVendorAccountSort.NEWEST;

    const [stats, result] = await Promise.all([
      this.repository.getVendorAccountStats(),
      this.repository.findVendorAccounts({
        search: query.search,
        status: query.status,
        subscriptionStatus: query.subscriptionStatus,
        sort,
        page,
        limit,
      }),
    ]);

    return this.adminMapper.toListResponse({
      stats,
      result,
      page,
      limit,
    });
  }

  async getVendorOverview(
    vendorId: string,
    query: AdminVendorAccountOverviewQueryDto,
  ): Promise<AdminVendorAccountOverviewResponseDto> {
    const range = query.range ?? AdminVendorOverviewRange.MONTH;

    const { startDate, endDate, buckets } =
      this.buildDateBuckets1(range);

    const previousRange = this.buildPreviousDateRange(
      startDate,
      endDate,
    );

    const vendor = await this.repository.findVendorOverviewById(
      vendorId,
    );

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const [
      orders,
      allCompletedOrders,
      profileViewRows,
      currentProfileViewCount,
      previousProfileViewCount,
      favoriteCount,
      recentFavorites,
    ] = await Promise.all([
      this.repository.findVendorOrdersForOverview({
        vendorId,
        startDate,
        endDate,
      }),

      this.repository.findVendorAllCompletedOrders(vendorId),

      this.repository.findVendorProfileViewsForOverview({
        vendorId,
        startDate,
        endDate,
      }),

      this.repository.countVendorProfileViewsInRange({
        vendorId,
        startDate,
        endDate,
      }),

      this.repository.countVendorProfileViewsInRange({
        vendorId,
        startDate: previousRange.startDate,
        endDate: previousRange.endDate,
      }),

      this.repository.countVendorFavorites(vendorId),

      this.repository.findRecentVendorFavorites({
        vendorId,
        limit: 5,
      }),
    ]);

    const favoriteCustomerIds = recentFavorites.map(
      (item) => item.customer.id,
    );

    const favoriteCustomerOrderSummaries =
      await this.repository.findFavoriteCustomerOrderSummaries({
        vendorId,
        customerIds: favoriteCustomerIds,
      });

    const favoriteOrderSummaryMap = new Map(
      favoriteCustomerOrderSummaries.map((item) => [
        item.customerId,
        item,
      ]),
    );

    const favorites = {
      count: favoriteCount,
      recent: recentFavorites.map((item) => {
        const orderSummary = favoriteOrderSummaryMap.get(
          item.customer.id,
        );

        return {
          customerId: item.customer.id,
          customerName:
            item.customer.user.name ??
            item.customer.user.email ??
            'Customer',
          email: item.customer.user.email,
          favoritedAt: item.createdAt,

          orderCount: orderSummary?.orderCount ?? 0,
          totalSpent: Number(
            (orderSummary?.totalSpent ?? 0).toFixed(2),
          ),
        };
      }),
    };

    const totalRevenue = allCompletedOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    const orderDistribution =
      this.calculateOrderDistribution(orders);

    const revenueChart = this.calculateRevenueChart({
      orders,
      buckets,
      currency: vendor.subscriptionPlan?.currency ?? 'USD',
    });

    const customerEngagement =
      this.calculateCustomerEngagement({
        orders,
        buckets,
      });

    const profileViews = this.calculateProfileViews({
      rows: profileViewRows,
      buckets,
      currentTotal: currentProfileViewCount,
      previousTotal: previousProfileViewCount,
    });

    return this.adminMapper.toOverviewResponse1({
      vendor,
      range,
      totalRevenue,
      orderDistribution,
      revenueChart,
      customerEngagement,
      profileViews,
      favorites,
    });
  }

  private calculateOrderDistribution(
    orders: AdminVendorOverviewOrderRow[],
  ) {
    const totalOrders = orders.length;

    const completed = orders.filter(
      (order) => order.status === OrderStatus.COMPLETED,
    ).length;

    const cancelled = orders.filter(
      (order) => order.status === OrderStatus.CANCELLED,
    ).length;

    const incomplete = orders.filter(
      (order) =>
        order.status !== OrderStatus.COMPLETED &&
        order.status !== OrderStatus.CANCELLED,
    ).length;

    const itemsSold = orders.reduce((sum, order) => {
      return (
        sum +
        order.orderItems.reduce(
          (itemSum, item) => itemSum + item.quantity,
          0,
        )
      );
    }, 0);

    return {
      totalOrders,
      itemsSold,
      completed,
      cancelled,
      incomplete,
      completedPercent: this.percent(completed, totalOrders),
      cancelledPercent: this.percent(cancelled, totalOrders),
      incompletePercent: this.percent(incomplete, totalOrders),
    };
  }

  private calculateRevenueChart(data: {
    orders: AdminVendorOverviewOrderRow[];
    buckets: DateBucket[];
    currency: string;
  }) {
    const bucketMap = this.createEmptyBucketMap(data.buckets);

    for (const order of data.orders) {
      if (order.status !== OrderStatus.COMPLETED) {
        continue;
      }

      const bucket = this.findBucketForDate(
        order.createdAt,
        data.buckets,
      );

      if (!bucket) {
        continue;
      }

      bucketMap.set(
        bucket.key,
        (bucketMap.get(bucket.key) ?? 0) + order.totalAmount,
      );
    }

    const items = this.mapBucketToChartItems(data.buckets, bucketMap);

    return {
      total: items.reduce((sum, item) => sum + item.value, 0),
      currency: data.currency,
      items,
    };
  }

  private calculateCustomerEngagement(data: {
    orders: AdminVendorOverviewOrderRow[];
    buckets: DateBucket[];
  }) {
    const completedOrders = data.orders.filter(
      (order) => order.status === OrderStatus.COMPLETED,
    );

    const customerOrderCount = new Map<string, number>();

    for (const order of completedOrders) {
      customerOrderCount.set(
        order.customerId,
        (customerOrderCount.get(order.customerId) ?? 0) + 1,
      );
    }

    const repeatedCustomerIds = new Set(
      Array.from(customerOrderCount.entries())
        .filter(([, count]) => count > 1)
        .map(([customerId]) => customerId),
    );

    const totalCustomers = customerOrderCount.size;
    const repeatedCustomers = repeatedCustomerIds.size;
    const newCustomers = Math.max(totalCustomers - repeatedCustomers, 0);

    const bucketMap = new Map<
      string,
      {
        newCustomers: Set<string>;
        repeatedCustomers: Set<string>;
      }
    >();

    for (const bucket of data.buckets) {
      bucketMap.set(bucket.key, {
        newCustomers: new Set<string>(),
        repeatedCustomers: new Set<string>(),
      });
    }

    for (const order of completedOrders) {
      const bucket = this.findBucketForDate(order.createdAt, data.buckets);

      if (!bucket) {
        continue;
      }

      const bucketData = bucketMap.get(bucket.key);

      if (!bucketData) {
        continue;
      }

      if (repeatedCustomerIds.has(order.customerId)) {
        bucketData.repeatedCustomers.add(order.customerId);
      } else {
        bucketData.newCustomers.add(order.customerId);
      }
    }

    return {
      totalCustomers,
      newCustomers,
      repeatedCustomers,
      repeatRate: this.percent(repeatedCustomers, totalCustomers),
      items: data.buckets.map((bucket) => {
        const item = bucketMap.get(bucket.key);

        return {
          label: bucket.label,
          newCustomers: item?.newCustomers.size ?? 0,
          repeatedCustomers: item?.repeatedCustomers.size ?? 0,
        };
      }),
    };
  }

  private calculateProfileViews(data: {
    rows: AdminVendorOverviewProfileViewRow[];
    buckets: DateBucket[];
    currentTotal: number;
    previousTotal: number;
  }) {
    const bucketMap = this.createEmptyBucketMap(data.buckets);

    for (const row of data.rows) {
      const bucket = this.findBucketForDate(row.viewedAt, data.buckets);

      if (!bucket) {
        continue;
      }

      bucketMap.set(bucket.key, (bucketMap.get(bucket.key) ?? 0) + 1);
    }

    return {
      total: data.currentTotal,
      growthPercent: this.calculateGrowthPercent(
        data.currentTotal,
        data.previousTotal,
      ),
      items: this.mapBucketToChartItems(data.buckets, bucketMap),
    };
  }

  private percent(value: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return Number(((value / total) * 100).toFixed(1));
  }

  private calculateGrowthPercent(
    current: number,
    previous: number,
  ): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private mapBucketToChartItems(
    buckets: DateBucket[],
    bucketMap: Map<string, number>,
  ) {
    return buckets.map((bucket) => ({
      label: bucket.label,
      value: Number((bucketMap.get(bucket.key) ?? 0).toFixed(2)),
    }));
  }

  private buildDateBuckets1(range: AdminVendorOverviewRange): {
    startDate: Date;
    endDate: Date;
    buckets: DateBucket[];
  } {
    const now = new Date();

    if (range === AdminVendorOverviewRange.WEEK) {
      return this.buildWeeklyBuckets1(now);
    }

    if (range === AdminVendorOverviewRange.YEAR) {
      return this.buildYearlyBuckets(now);
    }

    return this.buildMonthlyBuckets(now);
  }

  private buildWeeklyBuckets1(now: Date) {
    const buckets: DateBucket[] = [];

    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    for (let i = 0; i < 7; i++) {
      const start = new Date(startDate);
      start.setDate(startDate.getDate() + i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
        }).format(start),
        start,
        end,
      });
    }

    return {
      startDate,
      endDate,
      buckets,
    };
  }

  private buildMonthlyBuckets(now: Date) {
    const year = now.getFullYear();
    const month = now.getMonth();

    const startDate = new Date(year, month, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    const lastDay = endDate.getDate();

    const buckets: DateBucket[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const start = new Date(year, month, day);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      buckets.push({
        key: start.toISOString().slice(0, 10),
        label: String(day),
        start,
        end,
      });
    }

    return {
      startDate,
      endDate,
      buckets,
    };
  }

  private buildYearlyBuckets(now: Date) {
    const year = now.getFullYear();

    const startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);

    const buckets: DateBucket[] = [];

    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);

      buckets.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: new Intl.DateTimeFormat('en-US', {
          month: 'short',
        }).format(start),
        start,
        end,
      });
    }

    return {
      startDate,
      endDate,
      buckets,
    };
  }

  private buildPreviousDateRange(
    startDate: Date,
    endDate: Date,
  ): {
    startDate: Date;
    endDate: Date;
  } {
    const durationMs = endDate.getTime() - startDate.getTime();

    const previousEnd = new Date(startDate);
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

    const previousStart = new Date(
      previousEnd.getTime() - durationMs,
    );

    return {
      startDate: previousStart,
      endDate: previousEnd,
    };
  }

  async getVendorAccountOrders(
    vendorId: string,
    query: AdminVendorAccountOrdersQueryDto,
  ): Promise<AdminVendorAccountOrdersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status ?? AdminVendorOrderStatusFilter.ALL;
    const sort = query.sort ?? AdminVendorOrderSort.NEWEST;

    const vendor = await this.vendorService.findByVendorId(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const result = await this.repository.findVendorAccountOrders({
      vendorId,
      search: query.search,
      status,
      sort,
      page,
      limit,
    });

    return this.adminMapper.toVendorAccountOrdersResponse({
      result,
      page,
      limit,
    });
  }

  async getVendorDocuments(
    vendorId: string,
  ): Promise<AdminVendorDocumentsResponseDto> {
    const verification =
      await this.repository.findVendorDocuments(vendorId);

    if (!verification) {
      throw new NotFoundException('Documents not found');
    }

    return this.adminMapper.toVendorDocumentsResponseFromVerification(
      verification,
    );
  }

  async getVendorSubscription(
    vendorId: string,
  ): Promise<AdminVendorSubscriptionResponseDto> {
    const subscription =
      await this.repository.findSubscriptionByVendorId(vendorId);

    if (!subscription) {
      return { items: [] };
    }

    return this.adminMapper.toVendorSubscriptionResponse(subscription);
  }

  async updateVendorStatus(
    vendorId: string,
    status: VendorAdminStatus,
    reason?: string,
  ) {
    const vendor = await this.vendorService.findByVendorId(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (
      (status === 'SUSPENDED' || status === 'DISABLED') &&
      !reason
    ) {
      throw new BadRequestException(
        'Reason is required for this action',
      );
    }

    const data: any = {
      adminStatus: status,
      statusReason: reason ?? null,
    };

    if (status === 'SUSPENDED') {
      data.suspendedAt = new Date();
      data.disabledAt = null;
    }

    if (status === 'DISABLED') {
      data.disabledAt = new Date();
      data.suspendedAt = null;
    }

    if (status === 'ACTIVE') {
      data.suspendedAt = null;
      data.disabledAt = null;
    }

    const updated = await this.repository.updateStatus(
      vendorId,
      data,
    );

    return this.adminMapper.toVendorStatusResponse(updated);
  }

}


