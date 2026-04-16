import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { IHomeRepository } from '../domain/interface/home.repository.interface';
import { HomeResponseDto } from '../presentation/dto/home.response.dto';

@Injectable()
export class HomeService {
  constructor(
    @Inject('IHomeRepository')
    private readonly homeRepository: IHomeRepository,
  ) {}

  async getHome(userId: string): Promise<HomeResponseDto> {
    const customer = await this.homeRepository.findCustomerHomeProfileByUserId(userId);

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

        return {
          ...vendor,
          distanceKm,
          withinRadius: radiusKm > 0 ? distanceKm <= radiusKm : true,
          availability: this.resolveAvailability(vendor.operationHours),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyVendors = vendorsWithDistance.filter((vendor) => vendor.withinRadius);

    const homepageVendors =
      nearbyVendors.length > 0 ? nearbyVendors : vendorsWithDistance.slice(0, 10);

    const homepageVendorIds = homepageVendors.map((vendor) => vendor.id);

    const categories = await this.homeRepository.findDistinctCategoryNames(8);
    const cuisines = await this.homeRepository.findPopularCuisines(8);

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

      categories: categories.map((name) => ({ name })),

      popularCuisines: cuisines.map((item) => ({
        id: item.id,
        name: item.name,
      })),

      whatsNearMe: homepageVendors.slice(0, 6).map((vendor) => ({
        id: vendor.id,
        businessName: vendor.businessName ?? 'Unnamed Vendor',
        coverImage:
          vendor.coverImage ?? vendor.products[0]?.images[0]?.url ?? undefined,
        distanceKm: Number(vendor.distanceKm.toFixed(1)),
        cityLabel: this.extractCityLabel(vendor.serviceArea?.address),
        isOpen: vendor.availability.isOpen,
        statusLabel: vendor.availability.label,
      })),

      recommendedForYou: homepageVendors.slice(0, 6).map((vendor) => ({
        id: vendor.id,
        businessName: vendor.businessName ?? 'Unnamed Vendor',
        coverImage:
          vendor.coverImage ?? vendor.products[0]?.images[0]?.url ?? undefined,
        distanceKm: Number(vendor.distanceKm.toFixed(1)),
        cityLabel: this.extractCityLabel(vendor.serviceArea?.address),
        isOpen: vendor.availability.isOpen,
        statusLabel: vendor.availability.label,
      })),

      topPicksForYou: topPicksSorted.slice(0, 6).map((product) => ({
        id: product.id,
        name: product.name,
        image: product.images[0]?.url,
        price: product.price,
        vendorId: product.vendorId,
        vendorName: product.vendor.businessName ?? 'Unnamed Vendor',
        distanceKm: Number(
          this.calculateDistanceKm(
            customer.latitude!,
            customer.longitude!,
            product.vendor.serviceArea?.latitude ?? customer.latitude!,
            product.vendor.serviceArea?.longitude ?? customer.longitude!,
          ).toFixed(1),
        ),
        categoryName: product.category?.name ?? undefined,
      })),

      trySomethingNew: trySomethingNew.slice(0, 10).map((product) => ({
        id: product.id,
        name: product.name,
        image: product.images[0]?.url,
        price: product.price,
        vendorId: product.vendorId,
        vendorName: product.vendor.businessName ?? 'Unnamed Vendor',
        distanceKm: Number(
          this.calculateDistanceKm(
            customer.latitude!,
            customer.longitude!,
            product.vendor.serviceArea?.latitude ?? customer.latitude!,
            product.vendor.serviceArea?.longitude ?? customer.longitude!,
          ).toFixed(1),
        ),
        categoryName: product.category?.name ?? undefined,
      })),
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
        !item.isClosed &&
        item.openTime !== null &&
        item.openTime > currentTime,
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
}