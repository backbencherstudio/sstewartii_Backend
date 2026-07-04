import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { IHomeRepository } from '../domain/interface/home.repository.interface';
import {
  HomeResponseDto,
  HomeVendorCardDto,
  HomeProductCardDto,
} from '../presentation/dto/home.response.dto';
import { MediaService } from '@/common/media/media.service';

@Injectable()
export class HomeService {
  constructor(
    @Inject('IHomeRepository')
    private readonly homeRepository: IHomeRepository,
    private readonly mediaService: MediaService,
  ) {}

  async getHome(userId: string): Promise<HomeResponseDto> {
    const customer =
      await this.homeRepository.findCustomerHomeProfileByUserId(userId);

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (customer.latitude === null || customer.longitude === null) {
      throw new BadRequestException(
        'Customer location is required to load home page',
      );
    }

    const vendors = await this.homeRepository.findVendorCandidates();

    const vendorsWithDistance = vendors
      .map((vendor) => {
        const distanceKm = this.calculateDistanceKm(
          customer.latitude!,
          customer.longitude!,
          vendor.serviceArea.latitude,
          vendor.serviceArea.longitude,
        );

        const radiusKm = vendor.serviceArea.radius ?? 0;

        const availability = this.resolveAvailability(
          vendor.operationHours ?? [],
        );

        return {
          ...vendor,
          distanceKm,
          withinRadius: radiusKm > 0 ? distanceKm <= radiusKm : true,
          availability,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyVendors = vendorsWithDistance.filter(
      (vendor) => vendor.withinRadius,
    );

    const homepageVendors =
      nearbyVendors.length > 0
        ? nearbyVendors
        : vendorsWithDistance.slice(0, 10);

    const homepageVendorIds = homepageVendors.map((vendor) => vendor.id);

    const [categories, cuisines, favoriteVendorIds, favoriteProductIds] =
      await Promise.all([
        this.homeRepository.findHomeCategories(8),
        this.homeRepository.findPopularCuisines(8),
        this.homeRepository.findFavoriteVendorIdsByCustomerId(customer.id),
        this.homeRepository.findFavoriteProductIdsByCustomerId(customer.id),
      ]);

    const favoriteVendorIdSet = new Set(favoriteVendorIds);
    const favoriteProductIdSet = new Set(favoriteProductIds);

    const popularTrucksNearby = [...homepageVendors].sort((a, b) => {
      const bRating = b.truckReviewAverage ?? 0;
      const aRating = a.truckReviewAverage ?? 0;

      if (bRating !== aRating) {
        return bRating - aRating;
      }

      const bReviewCount = b.truckReviewCount ?? 0;
      const aReviewCount = a.truckReviewCount ?? 0;

      if (bReviewCount !== aReviewCount) {
        return bReviewCount - aReviewCount;
      }

      return a.distanceKm - b.distanceKm;
    });

    let topPicks = await this.homeRepository.findProductsForHome(
      homepageVendorIds,
      8,
    );

    if (!topPicks.length) {
      topPicks = await this.homeRepository.findProductsFallback(8);
    }

    const topPicksSorted = topPicks.sort((a, b) => {
      const aDistance = this.calculateDistanceKm(
        customer.latitude!,
        customer.longitude!,
        a.vendor.serviceArea?.latitude ?? customer.latitude!,
        a.vendor.serviceArea?.longitude ?? customer.longitude!,
      );

      const bDistance = this.calculateDistanceKm(
        customer.latitude!,
        customer.longitude!,
        b.vendor.serviceArea?.latitude ?? customer.latitude!,
        b.vendor.serviceArea?.longitude ?? customer.longitude!,
      );

      return aDistance - bDistance;
    });

    const topPickIds = topPicksSorted.map((item) => item.id);

    let trySomethingNew = await this.homeRepository.findProductsForHome(
      homepageVendorIds,
      10,
      topPickIds,
    );

    if (!trySomethingNew.length) {
      trySomethingNew = await this.homeRepository.findProductsFallback(
        10,
        topPickIds,
      );

      if (!trySomethingNew.length) {
        trySomethingNew = await this.homeRepository.findProductsFallback(10);
      }
    }

    return {
      user: {
        id: customer.user.id,
        email: customer.user.email,
        name: customer.user.name,
      },

      currentLocation: {
        address: customer.address ?? undefined,
        latitude: customer.latitude,
        longitude: customer.longitude,
      },

      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),

      popularCuisines: cuisines.map((item) => ({
        id: item.id,
        name: item.name,
        imageUrl: this.resolveMediaUrl(item.imageUrl),
      })),

      whatsNearMe: homepageVendors
        .slice(0, 6)
        .map((vendor) => this.toHomeVendorCard(vendor, favoriteVendorIdSet)),

      recommendedForYou: homepageVendors
        .slice(0, 6)
        .map((vendor) => this.toHomeVendorCard(vendor, favoriteVendorIdSet)),

      explorePopularTrucksNearby: popularTrucksNearby
        .slice(0, 6)
        .map((vendor) => this.toHomeVendorCard(vendor, favoriteVendorIdSet)),

      topPicksForYou: topPicksSorted
        .slice(0, 6)
        .map((product) =>
          this.toHomeProductCard(
            product,
            customer.latitude!,
            customer.longitude!,
            favoriteProductIdSet,
          ),
        ),

      trySomethingNew: trySomethingNew
        .slice(0, 10)
        .map((product) =>
          this.toHomeProductCard(
            product,
            customer.latitude!,
            customer.longitude!,
            favoriteProductIdSet,
          ),
        ),
    };
  }

  private toHomeVendorCard(
    vendor: any,
    favoriteVendorIdSet: Set<string>,
  ): HomeVendorCardDto {
    const productImage = vendor.products?.[0]?.images?.[0]?.url;

    return {
      id: vendor.id,
      businessName: vendor.businessName ?? 'Unnamed Vendor',
      bio: vendor.bio ?? undefined,

      coverImage:
        this.resolveMediaUrl(vendor.coverImage) ??
        this.resolveMediaUrl(productImage),

      distanceKm: Number((vendor.distanceKm ?? 0).toFixed(1)),

      cityLabel: this.extractCityLabel(vendor.serviceArea?.address),

      isOpen: vendor.availability?.isOpen ?? false,
      statusLabel: vendor.availability?.label ?? 'Temporarily Closed',

      rating: Number((vendor.truckReviewAverage ?? 0).toFixed(1)),
      reviewCount: vendor.truckReviewCount ?? 0,

      isFavorite: favoriteVendorIdSet.has(vendor.id),
    };
  }

  private toHomeProductCard(
    product: any,
    customerLatitude: number,
    customerLongitude: number,
    favoriteProductIdSet: Set<string>,
  ): HomeProductCardDto {
    const distanceKm = this.calculateDistanceKm(
      customerLatitude,
      customerLongitude,
      product.vendor.serviceArea?.latitude ?? customerLatitude,
      product.vendor.serviceArea?.longitude ?? customerLongitude,
    );

    return {
      id: product.id,
      name: product.name,
      image: this.resolveMediaUrl(product.images?.[0]?.url),
      price: product.price,

      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName ?? 'Unnamed Vendor',

      distanceKm: Number(distanceKm.toFixed(1)),

      categoryId: product.category?.id ?? undefined,
      categoryName: product.category?.name ?? undefined,

      rating: Number((product.foodReviewAverage ?? 0).toFixed(1)),
      reviewCount: product.foodReviewCount ?? 0,

      isFavorite: favoriteProductIdSet.has(product.id),
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

  private extractCityLabel(address?: string | null): string | undefined {
    if (!address) {
      return undefined;
    }

    return address.split(',')[0]?.trim() || undefined;
  }

  private resolveMediaUrl(path?: string | null): string | undefined {
    if (!path) {
      return undefined;
    }

    return this.mediaService.getUrl(path) ?? path;
  }
}
