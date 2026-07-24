import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { VendorLiveStatus } from '@prisma/client';

import type { ICustomerRepository } from '../domain/interface/customer.repository.interface';
import { CustomerEntity } from '../domain/entities/customer.entity';

import { CustomerMapper } from '../infrastructure/mapper/customer.mapper';

import {
  NearbyVendorsQueryDto,
  TopPicksQueryDto,
  ExploreMapQueryDto,
  FoodFilterQueryDto,
  FavoriteProductsQueryDto,
  SetCustomerLocationDto,
  FavoriteVendorsQueryDto,
  CustomerAdvancedSearchQueryDto,
  CustomerSearchSortBy,
  CustomerSearchType,
  OrderHistoryQueryDto,
  OrderAgainDto,
} from '../presentation/dto/customer.dto';

import {
  NearbyVendorsResponseDto,
  TopPicksResponseDto,
  ExploreMapResponseDto,
  FoodFilterResponseDto,
  FavoriteProductsResponseDto,
  CustomerResponseDto,
  FavoriteVendorsResponseDto,
  CustomerAdvancedSearchResponseDto,
} from '../presentation/dto/customer.response.dto';

import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';
import { IStorageService } from '@/common/storage/storage.interface';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(
    @Inject('ICustomerRepository')
    private readonly repo: ICustomerRepository,
    private readonly vendorService: VendorService,
    private readonly mapper: CustomerMapper,
    @Inject(IStorageService)
    private readonly storage: IStorageService,
    private readonly prisma: PrismaService
  ) {}

  async findActiveByUserId(userId: string): Promise<CustomerEntity | null> {
    return this.repo.findByUserId(userId);
  }

  async findActiveByCustomerId(
    customerId: string,
  ): Promise<CustomerEntity | null> {
    return this.repo.findByCustomerId(customerId);
  }

  async setLocation(
    userId: string,
    dto: SetCustomerLocationDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    let finalCustomer: CustomerEntity;

    if (!customer) {
      finalCustomer = await this.repo.create({
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
      });
    } else {
      finalCustomer = await this.repo.updateLocation(userId, dto);
    }

    return CustomerMapper.toResponse(finalCustomer);
  }

  async getNearbyVendors(
    userId: string,
    query: NearbyVendorsQueryDto,
  ): Promise<NearbyVendorsResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (
      !customer ||
      !customer.isActive ||
      customer.latitude === null ||
      customer.longitude === null
    ) {
      throw new BadRequestException(
        'Customer location is required to load nearby vendors',
      );
    }

    const [vendors, favoriteVendorIds] = await Promise.all([
      this.repo.findNearbyVendorCandidates(query),
      this.repo.findFavoriteVendorIdsByCustomerId(customer.id),
    ]);

    const favoriteVendorIdSet = new Set(favoriteVendorIds);

    const enriched = vendors
      .filter((vendor) => {
        return (
          vendor.serviceArea &&
          vendor.serviceArea.latitude !== null &&
          vendor.serviceArea.longitude !== null
        );
      })
      .map((vendor) => {
        const distanceKm = this.calculateDistanceKm(
          customer.latitude!,
          customer.longitude!,
          vendor.serviceArea.latitude,
          vendor.serviceArea.longitude,
        );

        const radiusKm = vendor.serviceArea.radius ?? 0;
        const withinRadius = radiusKm > 0 ? distanceKm <= radiusKm : true;

        const availability = this.resolveVendorAvailability(
          vendor.status,
          vendor.operationHours ?? [],
        );

        return {
          ...vendor,
          distanceKm,
          withinRadius,
          availability,
        };
      })
      .filter((vendor) => vendor.withinRadius)
      .sort((a, b) => {
        if (a.availability.isOpen !== b.availability.isOpen) {
          return a.availability.isOpen ? -1 : 1;
        }

        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }

        if ((b.truckReviewAverage ?? 0) !== (a.truckReviewAverage ?? 0)) {
          return (b.truckReviewAverage ?? 0) - (a.truckReviewAverage ?? 0);
        }

        return (b.truckReviewCount ?? 0) - (a.truckReviewCount ?? 0);
      });

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const total = enriched.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const start = (page - 1) * limit;
    const paginated = enriched.slice(start, start + limit);

    return {
      items: paginated.map((vendor) =>
        this.mapper.toNearbyVendorCard(vendor, favoriteVendorIdSet),
      ),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getTopPicks(
    userId: string,
    query: TopPicksQueryDto,
  ): Promise<TopPicksResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (
      !customer ||
      !customer.isActive ||
      customer.latitude === null ||
      customer.longitude === null
    ) {
      throw new BadRequestException(
        'Customer location is required to load top picks',
      );
    }

    const products = await this.repo.findTopPickProducts(query);

    const enriched = products
      .map((product) => {
        const vendorLat = product.vendor?.serviceArea?.latitude;
        const vendorLng = product.vendor?.serviceArea?.longitude;
        const radiusKm = product.vendor?.serviceArea?.radius ?? 0;

        const distanceKm =
          vendorLat !== undefined &&
          vendorLat !== null &&
          vendorLng !== undefined &&
          vendorLng !== null
            ? this.calculateDistanceKm(
                customer.latitude!,
                customer.longitude!,
                vendorLat,
                vendorLng,
              )
            : Number.MAX_SAFE_INTEGER;

        const withinRadius = radiusKm > 0 ? distanceKm <= radiusKm : true;

        return {
          ...product,
          distanceKm,
          withinRadius,
        };
      })
      .filter((product) => product.withinRadius)
      .sort((a, b) => {
        if ((b.vendor?.reviewAverage ?? 0) !== (a.vendor?.reviewAverage ?? 0)) {
          return (
            (b.vendor?.reviewAverage ?? 0) - (a.vendor?.reviewAverage ?? 0)
          );
        }

        if ((b.vendor?.reviewCount ?? 0) !== (a.vendor?.reviewCount ?? 0)) {
          return (b.vendor?.reviewCount ?? 0) - (a.vendor?.reviewCount ?? 0);
        }

        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }

        return a.price - b.price;
      });

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = enriched.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = enriched.slice(start, start + limit);

    return {
      items: paginated.map((product) =>
        this.mapper.toTopPickProductCard(product),
      ),
      page,
      limit,
      total,
      totalPages,
    };
  }

  private calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (value: number): number => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private resolveAvailability(
    operationHours: Array<{
      dayOfWeek: number;
      openTime: string | null;
      closeTime: string | null;
      isClosed: boolean;
      activeFrom: Date;
      activeTo: Date | null;
    }>,
  ): { isOpen: boolean; label: string } {
    const now = new Date();
    const today = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const todaysHours = operationHours
      .filter(
        (item) =>
          item.dayOfWeek === today &&
          item.activeFrom <= now &&
          (!item.activeTo || item.activeTo >= now),
      )
      .sort((a, b) => (a.openTime ?? '').localeCompare(b.openTime ?? ''));

    if (!todaysHours.length) {
      return {
        isOpen: false,
        label: 'Temporarily Closed',
      };
    }

    const currentSlot = todaysHours.find((item) => {
      if (item.isClosed || !item.openTime || !item.closeTime) {
        return false;
      }

      return currentTime >= item.openTime && currentTime <= item.closeTime;
    });

    if (currentSlot) {
      return {
        isOpen: true,
        label: 'Open Now',
      };
    }

    const nextSlot = todaysHours.find(
      (item) =>
        !item.isClosed && item.openTime !== null && item.openTime > currentTime,
    );

    if (nextSlot?.openTime) {
      return {
        isOpen: false,
        label: `Opens at ${this.formatTime(nextSlot.openTime)}`,
      };
    }

    return {
      isOpen: false,
      label: 'Temporarily Closed',
    };
  }

  private formatTime(time: string): string {
    const [hourStr, minute] = time.split(':');
    const hour = Number(hourStr);

    const suffix = hour >= 12 ? 'pm' : 'am';
    const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${normalizedHour}:${minute}${suffix}`;
  }

  async getExploreMap(
    userId: string,
    query: ExploreMapQueryDto,
  ): Promise<ExploreMapResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (
      !customer ||
      !customer.isActive ||
      customer.latitude == null ||
      customer.longitude == null
    ) {
      throw new BadRequestException(
        'Customer location is required to load explore map',
      );
    }

    const customerLat = customer.latitude;
    const customerLng = customer.longitude;

    const vendors = await this.repo.findExploreMapVendorCandidates(query);

    const radiusKm = query.radiusKm ?? 10;

    const enriched = vendors
      .map((vendor) => {
        const distanceKm = this.calculateDistanceKm(
          customer.latitude!,
          customer.longitude!,
          vendor.serviceArea.latitude,
          vendor.serviceArea.longitude,
        );

        const withinRequestedRadius = distanceKm <= radiusKm;
        const availability = this.resolveAvailability(vendor.operationHours);

        return {
          ...vendor,
          distanceKm,
          withinRequestedRadius,
          availability,
        };
      })
      .filter((vendor) => vendor.withinRequestedRadius)
      .sort((a, b) => {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }

        if ((b.reviewAverage ?? 0) !== (a.reviewAverage ?? 0)) {
          return (b.reviewAverage ?? 0) - (a.reviewAverage ?? 0);
        }

        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      });

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = enriched.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = enriched.slice(start, start + limit);

    return {
      center: {
        latitude: customerLat,
        longitude: customerLng,
        address: customer.address ?? undefined,
      },
      pins: paginated.map((vendor) => CustomerMapper.toExploreMapPin(vendor)),
      cards: paginated.map((vendor) => CustomerMapper.toExploreMapCard(vendor)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async getFoods(
    userId: string,
    query: FoodFilterQueryDto,
  ): Promise<FoodFilterResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (
      !customer ||
      !customer.isActive ||
      customer.latitude == null ||
      customer.longitude == null
    ) {
      throw new BadRequestException(
        'Customer location is required to load foods',
      );
    }

    const customerLat = customer.latitude;
    const customerLng = customer.longitude;

    const products = await this.repo.findFoodCandidates(query);
    const radiusKm = query.radiusKm ?? 10;

    const enriched = products
      .map((product) => {
        const vendorLat = product.vendor?.serviceArea?.latitude;
        const vendorLng = product.vendor?.serviceArea?.longitude;

        const distanceKm =
          vendorLat != null && vendorLng != null
            ? this.calculateDistanceKm(
                customerLat,
                customerLng,
                vendorLat,
                vendorLng,
              )
            : Number.MAX_SAFE_INTEGER;

        const availability = this.resolveAvailability(
          product.vendor?.operationHours ?? [],
        );

        return {
          ...product,
          distanceKm,
          availability,
        };
      })
      .filter((product) => product.distanceKm <= radiusKm)
      .filter((product) => {
        if (query.openNow === true) {
          return product.availability.isOpen;
        }
        return true;
      })
      .sort((a, b) => {
        const sortBy = query.sortBy ?? 'recommended';

        switch (sortBy) {
          case 'popular':
            if ((b.vendor?.reviewCount ?? 0) !== (a.vendor?.reviewCount ?? 0)) {
              return (
                (b.vendor?.reviewCount ?? 0) - (a.vendor?.reviewCount ?? 0)
              );
            }
            return (
              (b.vendor?.reviewAverage ?? 0) - (a.vendor?.reviewAverage ?? 0)
            );

          case 'open_now':
            if (a.availability.isOpen !== b.availability.isOpen) {
              return a.availability.isOpen ? -1 : 1;
            }
            return a.distanceKm - b.distanceKm;

          case 'top_rated':
            if (
              (b.vendor?.reviewAverage ?? 0) !== (a.vendor?.reviewAverage ?? 0)
            ) {
              return (
                (b.vendor?.reviewAverage ?? 0) - (a.vendor?.reviewAverage ?? 0)
              );
            }
            return (b.vendor?.reviewCount ?? 0) - (a.vendor?.reviewCount ?? 0);

          case 'nearby':
          case 'close_by':
            return a.distanceKm - b.distanceKm;

          case 'price_low_to_high':
            return a.price - b.price;

          case 'price_high_to_low':
            return b.price - a.price;

          case 'recommended':
          default:
            if (a.availability.isOpen !== b.availability.isOpen) {
              return a.availability.isOpen ? -1 : 1;
            }
            if (
              (b.vendor?.reviewAverage ?? 0) !== (a.vendor?.reviewAverage ?? 0)
            ) {
              return (
                (b.vendor?.reviewAverage ?? 0) - (a.vendor?.reviewAverage ?? 0)
              );
            }
            if ((b.vendor?.reviewCount ?? 0) !== (a.vendor?.reviewCount ?? 0)) {
              return (
                (b.vendor?.reviewCount ?? 0) - (a.vendor?.reviewCount ?? 0)
              );
            }
            return a.distanceKm - b.distanceKm;
        }
      });

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = enriched.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = enriched.slice(start, start + limit);

    return {
      items: paginated.map((product) => this.mapper.toFoodCard(product)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async toggleFavoriteProduct(
    userId: string,
    productId: string,
  ): Promise<{ isFavorited: boolean }> {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found');
    }

    const product = await this.repo.findActiveProductById(productId);

    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    const existing = await this.repo.findFavoriteProduct(
      customer.id,
      productId,
    );

    if (existing) {
      await this.repo.removeFavoriteProduct(existing.id);

      return { isFavorited: false };
    }

    await this.repo.createFavoriteProduct({
      customerId: customer.id,
      productId,
    });

    return { isFavorited: true };
  }

  async getFavoriteProducts(
    userId: string,
    query: FavoriteProductsQueryDto,
  ): Promise<FavoriteProductsResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found');
    }

    const favoriteProducts = await this.repo.findFavoriteProducts(
      customer.id,
      query,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = favoriteProducts.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = favoriteProducts.slice(start, start + limit);

    return {
      items: paginated.map((item) => this.mapper.toFavoriteProductItem(item)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async toggleFavoriteVendor(
    userId: string,
    vendorId: string,
  ): Promise<{ isFavorited: boolean }> {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found');
    }

    const vendor = await this.vendorService.findByVendorId(vendorId);

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const existing = await this.repo.findFavoriteVendor(customer.id, vendorId);

    if (existing) {
      await this.repo.removeFavoriteVendor(existing.id);

      return { isFavorited: false };
    }

    await this.repo.createFavoriteVendor({
      customerId: customer.id,
      vendorId,
    });

    return { isFavorited: true };
  }

  async getFavoriteVendors(
    userId: string,
    query: FavoriteVendorsQueryDto,
  ): Promise<FavoriteVendorsResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found');
    }

    const favoriteVendors = await this.repo.findFavoriteVendors(
      customer.id,
      query,
    );

    const enriched = favoriteVendors
      .map((item) => {
        const vendor = item.vendor;

        let distanceKm: number | undefined;

        if (
          customer.latitude != null &&
          customer.longitude != null &&
          vendor.serviceArea?.latitude != null &&
          vendor.serviceArea?.longitude != null
        ) {
          distanceKm = this.calculateDistanceKm(
            customer.latitude,
            customer.longitude,
            vendor.serviceArea.latitude,
            vendor.serviceArea.longitude,
          );
        }

        const availability = this.resolveAvailability(
          vendor.operationHours ?? [],
        );

        return {
          ...item,
          distanceKm,
          availability,
        };
      })
      .sort((a, b) => {
        if (
          (a.distanceKm ?? Number.MAX_SAFE_INTEGER) !==
          (b.distanceKm ?? Number.MAX_SAFE_INTEGER)
        ) {
          return (
            (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
            (b.distanceKm ?? Number.MAX_SAFE_INTEGER)
          );
        }

        if ((b.vendor?.reviewAverage ?? 0) !== (a.vendor?.reviewAverage ?? 0)) {
          return (
            (b.vendor?.reviewAverage ?? 0) - (a.vendor?.reviewAverage ?? 0)
          );
        }

        return (b.vendor?.reviewCount ?? 0) - (a.vendor?.reviewCount ?? 0);
      });

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = enriched.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = enriched.slice(start, start + limit);

    return {
      items: paginated.map((item) => this.mapper.toFavoriteVendorItem(item)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async advancedSearch(
    userId: string,
    query: CustomerAdvancedSearchQueryDto,
  ): Promise<CustomerAdvancedSearchResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (
      !customer ||
      !customer.isActive ||
      customer.latitude == null ||
      customer.longitude == null
    ) {
      throw new BadRequestException('Customer location is required to search');
    }

    const customerLat = customer.latitude;
    const customerLng = customer.longitude;
    const radiusKm = query.radiusKm ?? 10;

    // console.log(query);

    if (query.type === CustomerSearchType.FOOD) {
      return this.searchFoods(
        customer.id,
        customerLat,
        customerLng,
        radiusKm,
        query,
      );
    }

    return this.searchTrucks(
      customer.id,
      customerLat,
      customerLng,
      radiusKm,
      query,
    );
  }

  async getAllFavoriteProductIds(
    userId: string,
  ): Promise<{ productIds: string[]; count: number }> {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    const productIds = await this.repo.findAllFavoriteProductIds(customer.id);

    return {
      productIds,
      count: productIds.length,
    };
  }

  /**
   * Get all favorite vendor IDs for a user
   */
  async getAllFavoriteVendorIds(
    userId: string,
  ): Promise<{ vendorIds: string[]; count: number }> {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    const vendorIds = await this.repo.findAllFavoriteVendorIds(customer.id);

    return {
      vendorIds,
      count: vendorIds.length,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      address?: string;
      preferredRadius?: number;
    },
    avatarFile?: Express.Multer.File,
  ): Promise<CustomerResponseDto> {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    // Prepare update data
    const updateData: {
      name?: string;
      phoneNumber?: string;
      dateOfBirth?: Date;
      address?: string;
      avatar?: string;
    } = {};

    // Only include fields that are provided
    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.phoneNumber !== undefined) {
      updateData.phoneNumber = data.phoneNumber;
    }

    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }

    if (data.address !== undefined) {
      updateData.address = data.address;
    }

    // Handle avatar upload
    if (avatarFile) {
      // If there's an existing avatar, delete it
      if (customer.avatar) {
        try {
          await this.storage.deleteFile(customer.avatar);
        } catch (error: any) {
          // Log error but continue
          console.log(`Failed to delete old avatar: ${error.message}`);
        }
      }

      // Upload new avatar
      const folder = `customer/avatars/${userId}`;
      const avatarUrl = await this.storage.uploadFile(avatarFile, folder);
      updateData.avatar = avatarUrl;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    const updatedCustomer = await this.repo.updateProfile(userId, updateData);

    return CustomerMapper.toResponse(updatedCustomer);
  }

  async getOrderHistory(userId: string, query: OrderHistoryQueryDto) {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const { items, total } = await this.repo.findOrderHistory(
      customer.id,
      query.filter ?? 'all',
      page,
      limit,
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items: items.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        vendorId: order.vendor.id,
        vendorName: order.vendor.businessName || 'Unnamed Vendor',
        vendorAddress:
          order.vendor.serviceArea?.address || 'Address not available',
        status: order.status.toLowerCase(),
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        estimatedReadyAt: order.estimatedReadyAt,
        confirmedAt: order.confirmedAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        itemCount: order.orderItems.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        ),
        thumbnail: order.vendor.coverImage || undefined,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    };
  }

  async getOrderDetail(userId: string, orderId: string) {
    // Verify customer exists
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    // Get order with details
    const order = await this.repo.findOrderDetail(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify the order belongs to this customer
    if (order.customerId !== customer.id) {
      throw new BadRequestException('This order does not belong to you');
    }

    // Check if can reorder (only completed orders)
    const canReorder = order.status === 'COMPLETED';

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      vendorId: order.vendor.id,
      vendorName: order.vendor.businessName || 'Unnamed Vendor',
      vendorAddress:
        order.vendor.serviceArea?.address || 'Address not available',
      vendorCoverImage: order.vendor.coverImage || undefined,
      status: order.status.toLowerCase(),
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      tax: order.tax,
      serviceFee: order.serviceFee,
      totalAmount: order.totalAmount,
      note: order.note,
      estimatedReadyAt: order.estimatedReadyAt,
      confirmedAt: order.confirmedAt,
      preparingAt: order.preparingAt,
      readyAt: order.readyAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      items: order.orderItems.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        sizeName: item.sizeName,
        sizePrice: item.sizePrice,
        choiceOptions: item.orderItemChoiceOption.map((choice: any) => ({
          name: choice.name,
          price: choice.price,
        })),
        addOns: item.orderItemAddOn.map((addOn: any) => ({
          name: addOn.name,
          price: addOn.price,
        })),
      })),
      canReorder,
    };
  }

  async orderAgain(
    userId: string,
    dto: OrderAgainDto,
  ) {
    const customer = await this.repo.findByUserId(userId);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    // Validate order id
    if (!dto.orderId) {
      throw new BadRequestException('Order ID is required');
    }

    // Get the original order
    const order = await this.repo.findOrderDetail(dto.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership
    if (order.customerId !== customer.id) {
      throw new BadRequestException('This order does not belong to you');
    }

    // Only completed orders can be reordered
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed orders can be reordered');
    }

    // Check if vendor is still active
    if (!order.vendor || order.vendor.adminStatus !== 'ACTIVE') {
      throw new BadRequestException('Vendor is not currently available');
    }

    // Create a new order with the same items
    // This is a simplified version - you may want to add more logic
    const newOrder = await this.prisma.$transaction(async (tx) => {
      // Check if there's an existing cart for this vendor
      let cart = await tx.cart.findUnique({
        where: {
          customerId_vendorId: {
            customerId: customer.id,
            vendorId: order.vendorId,
          },
        },
      });

      // If no cart exists, create one
      if (!cart) {
        cart = await tx.cart.create({
          data: {
            customerId: customer.id,
            vendorId: order.vendorId,
          },
        });
      }

      // Clear existing cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Add items from the original order to the cart
      for (const item of order.orderItems) {
        // Check if product is still active
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
            isActive: true,
            isDeleted: false,
          },
        });

        if (!product) {
          throw new BadRequestException(
            `Product "${item.productName}" is no longer available`,
          );
        }

        const cartItem = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
          },
        });

        // Add choice options
        for (const choice of item.orderItemChoiceOption) {
          await tx.cartItemChoiceOption.create({
            data: {
              cartItemId: cartItem.id,
              choiceOptionId: choice.choiceOptionId || '',
            },
          });
        }

        // Add add-ons
        for (const addOn of item.orderItemAddOn) {
          await tx.cartItemAddOn.create({
            data: {
              cartItemId: cartItem.id,
              addOnId: addOn.addOnId || '',
            },
          });
        }
      }

      return cart;
    });

    return {
      success: true,
      orderId: newOrder.id,
      message: 'Items added to cart successfully',
    };
  }

  private async searchFoods(
    customerId: string,
    customerLat: number,
    customerLng: number,
    radiusKm: number,
    query: CustomerAdvancedSearchQueryDto,
  ): Promise<CustomerAdvancedSearchResponseDto> {
    const [products, favoriteProductIds] = await Promise.all([
      this.repo.findFoodSearchCandidates(query),
      this.repo.findFavoriteProductIds(customerId),
    ]);

    // console.log('🔍 Products found before enrichment:', products.length);
    // console.log('📍 Customer Location:', { customerLat, customerLng });
    // console.log('📡 Radius:', radiusKm);

    // products.forEach((p) => {
    //   console.log(`📦 Product: ${p.name}`);
    //   console.log(`   Vendor: ${p.vendor?.businessName || 'Unknown'}`);
    //   console.log(
    //     `   ServiceArea: ${p.vendor?.serviceArea?.latitude}, ${p.vendor?.serviceArea?.longitude}`,
    //   );
    // });

    const favoriteSet = new Set(favoriteProductIds);

    const enriched = products
      .map((product) => {
        const vendorLat = product.vendor?.serviceArea?.latitude;
        const vendorLng = product.vendor?.serviceArea?.longitude;

        const distanceKm =
          vendorLat != null && vendorLng != null
            ? this.calculateDistanceKm(
                customerLat,
                customerLng,
                vendorLat,
                vendorLng,
              )
            : Number.MAX_SAFE_INTEGER;

        const availability = this.resolveAvailability(
          product.vendor?.operationHours ?? [],
        );

        return {
          ...product,
          distanceKm,
          availability,
        };
      })
      .filter((product) => product.distanceKm <= radiusKm)
      .filter((product) => {
        if (query.openNow === true) {
          return product.availability.isOpen;
        }

        return true;
      });

    const sorted = this.sortFoods(enriched, query.sortBy);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = sorted.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    return {
      type: 'FOOD',
      search: query.search,
      items: paginated.map((product) =>
        this.mapper.toAdvancedFoodItem(product, favoriteSet),
      ),
      page,
      limit,
      total,
      totalPages,
    };
  }

  private async searchTrucks(
    customerId: string,
    customerLat: number,
    customerLng: number,
    radiusKm: number,
    query: CustomerAdvancedSearchQueryDto,
  ): Promise<CustomerAdvancedSearchResponseDto> {
    const [vendors, favoriteVendorIds] = await Promise.all([
      this.repo.findTruckSearchCandidates(query),
      this.repo.findFavoriteVendorIds(customerId),
    ]);

    const favoriteSet = new Set(favoriteVendorIds);

    const enriched = vendors
      .map((vendor) => {
        const distanceKm = this.calculateDistanceKm(
          customerLat,
          customerLng,
          vendor.serviceArea.latitude,
          vendor.serviceArea.longitude,
        );

        const availability = this.resolveAvailability(
          vendor.operationHours ?? [],
        );

        return {
          ...vendor,
          distanceKm,
          availability,
        };
      })
      .filter((vendor) => vendor.distanceKm <= radiusKm)
      .filter((vendor) => {
        if (query.openNow === true) {
          return vendor.availability.isOpen;
        }

        return true;
      });

    const sorted = this.sortTrucks(enriched, query.sortBy);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const total = sorted.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    return {
      type: 'TRUCK',
      search: query.search,
      items: paginated.map((vendor) =>
        this.mapper.toAdvancedTruckItem(vendor, favoriteSet),
      ),
      page,
      limit,
      total,
      totalPages,
    };
  }

  private sortFoods(items: any[], sortBy?: CustomerSearchSortBy): any[] {
    const selectedSort = sortBy ?? CustomerSearchSortBy.RECOMMENDED;

    return [...items].sort((a, b) => {
      switch (selectedSort) {
        case CustomerSearchSortBy.POPULAR:
          return (b.foodReviewCount ?? 0) - (a.foodReviewCount ?? 0);

        case CustomerSearchSortBy.OPEN_NOW:
          if (a.availability.isOpen !== b.availability.isOpen) {
            return a.availability.isOpen ? -1 : 1;
          }
          return a.distanceKm - b.distanceKm;

        case CustomerSearchSortBy.TOP_RATED:
          if ((b.foodReviewAverage ?? 0) !== (a.foodReviewAverage ?? 0)) {
            return (b.foodReviewAverage ?? 0) - (a.foodReviewAverage ?? 0);
          }
          return (b.foodReviewCount ?? 0) - (a.foodReviewCount ?? 0);

        case CustomerSearchSortBy.NEARBY:
        case CustomerSearchSortBy.CLOSE_BY:
          return a.distanceKm - b.distanceKm;

        case CustomerSearchSortBy.PRICE_LOW_TO_HIGH:
          return a.price - b.price;

        case CustomerSearchSortBy.PRICE_HIGH_TO_LOW:
          return b.price - a.price;

        case CustomerSearchSortBy.RECOMMENDED:
        default:
          if (a.availability.isOpen !== b.availability.isOpen) {
            return a.availability.isOpen ? -1 : 1;
          }

          if ((b.foodReviewAverage ?? 0) !== (a.foodReviewAverage ?? 0)) {
            return (b.foodReviewAverage ?? 0) - (a.foodReviewAverage ?? 0);
          }

          if ((b.foodReviewCount ?? 0) !== (a.foodReviewCount ?? 0)) {
            return (b.foodReviewCount ?? 0) - (a.foodReviewCount ?? 0);
          }

          return a.distanceKm - b.distanceKm;
      }
    });
  }

  private sortTrucks(items: any[], sortBy?: CustomerSearchSortBy): any[] {
    const selectedSort = sortBy ?? CustomerSearchSortBy.RECOMMENDED;

    return [...items].sort((a, b) => {
      switch (selectedSort) {
        case CustomerSearchSortBy.POPULAR:
          return (b.truckReviewCount ?? 0) - (a.truckReviewCount ?? 0);

        case CustomerSearchSortBy.OPEN_NOW:
          if (a.availability.isOpen !== b.availability.isOpen) {
            return a.availability.isOpen ? -1 : 1;
          }
          return a.distanceKm - b.distanceKm;

        case CustomerSearchSortBy.TOP_RATED:
          if ((b.truckReviewAverage ?? 0) !== (a.truckReviewAverage ?? 0)) {
            return (b.truckReviewAverage ?? 0) - (a.truckReviewAverage ?? 0);
          }
          return (b.truckReviewCount ?? 0) - (a.truckReviewCount ?? 0);

        case CustomerSearchSortBy.NEARBY:
        case CustomerSearchSortBy.CLOSE_BY:
          return a.distanceKm - b.distanceKm;

        case CustomerSearchSortBy.RECOMMENDED:
        default:
          if (a.availability.isOpen !== b.availability.isOpen) {
            return a.availability.isOpen ? -1 : 1;
          }

          if ((b.truckReviewAverage ?? 0) !== (a.truckReviewAverage ?? 0)) {
            return (b.truckReviewAverage ?? 0) - (a.truckReviewAverage ?? 0);
          }

          if ((b.truckReviewCount ?? 0) !== (a.truckReviewCount ?? 0)) {
            return (b.truckReviewCount ?? 0) - (a.truckReviewCount ?? 0);
          }

          return a.distanceKm - b.distanceKm;
      }
    });
  }

  private resolveVendorAvailability(
    vendorStatus: VendorLiveStatus,
    operationHours: Array<{
      dayOfWeek: number;
      openTime: string | null;
      closeTime: string | null;
      isClosed: boolean;
      activeFrom?: Date;
      activeTo?: Date | null;
    }>,
  ): {
    isOpen: boolean;
    label: string;
  } {
    /**
     * Vendor manual status has highest priority.
     */
    if (vendorStatus === VendorLiveStatus.OFFLINE) {
      return {
        isOpen: false,
        label: 'Closed',
      };
    }

    if (vendorStatus === VendorLiveStatus.TEMPORARILY_CLOSED) {
      return {
        isOpen: false,
        label: 'Temporarily Closed',
      };
    }

    /**
     * Only ONLINE vendors can be considered open.
     */
    const now = new Date();
    const today = now.getDay();

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const todaysHours = operationHours
      .filter((hour) => {
        if (hour.dayOfWeek !== today) {
          return false;
        }

        if (hour.isClosed) {
          return false;
        }

        if (!hour.openTime || !hour.closeTime) {
          return false;
        }

        if (hour.activeFrom && hour.activeFrom > now) {
          return false;
        }

        if (hour.activeTo && hour.activeTo < now) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        return (a.openTime ?? '').localeCompare(b.openTime ?? '');
      });

    if (!todaysHours.length) {
      return {
        isOpen: false,
        label: 'Closed',
      };
    }

    const currentSlot = todaysHours.find((hour) => {
      return currentTime >= hour.openTime! && currentTime <= hour.closeTime!;
    });

    if (currentSlot) {
      return {
        isOpen: true,
        label: 'Open Now',
      };
    }

    const nextSlot = todaysHours.find((hour) => {
      return hour.openTime! > currentTime;
    });

    if (nextSlot) {
      return {
        isOpen: false,
        label: `Opens at ${this.formatTimeLabel(nextSlot.openTime!)}`,
      };
    }

    return {
      isOpen: false,
      label: 'Closed',
    };
  }

  private formatTimeLabel(time: string): string {
    const [hourRaw, minuteRaw] = time.split(':');

    const hour = Number(hourRaw);
    const minute = minuteRaw ?? '00';

    const suffix = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${displayHour}:${minute}${suffix}`;
  }
}
