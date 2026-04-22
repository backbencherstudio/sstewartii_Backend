import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';

import type { ICustomerRepository } from '../domain/interface/customer.repository.interface';
import { CustomerEntity } from '../domain/entities/customer.entity';
import { CustomerMapper } from '../infrastructure/mapper/customer.mapper';
import  { SetCustomerLocationDto } from '../presentation/dto/customer.dto';
import { CustomerResponseDto } from '../presentation/dto/customer.response.dto';

import { 
  NearbyVendorsQueryDto, 
  TopPicksQueryDto,
  ExploreMapQueryDto,
} from '../presentation/dto/customer.dto';

import { 
  NearbyVendorsResponseDto, 
  TopPicksResponseDto,
  ExploreMapResponseDto,
 } from '../presentation/dto/customer.response.dto';

@Injectable()
export class CustomerService {
  constructor(
    @Inject('ICustomerRepository')
    private readonly repo: ICustomerRepository,
  ) {}

  async findActiveByUserId(userId: string): Promise<CustomerEntity | null> {
    return this.repo.findByUserId(userId);
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

    const vendors = await this.repo.findNearbyVendorCandidates(query);

    const enriched = vendors
      .map((vendor) => {
        const distanceKm = this.calculateDistanceKm(
          customer.latitude!,
          customer.longitude!,
          vendor.serviceArea.latitude,
          vendor.serviceArea.longitude,
        );

        const radiusKm = vendor.serviceArea.radius ?? 0;
        const withinRadius = radiusKm > 0 ? distanceKm <= radiusKm : true;

        return {
          ...vendor,
          distanceKm,
          withinRadius,
          availability: this.resolveAvailability(vendor.operationHours),
        };
      })
      .filter((vendor) => vendor.withinRadius)
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
      items: paginated.map((vendor) =>
        CustomerMapper.toNearbyVendorCard(vendor),
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
          return (b.vendor?.reviewAverage ?? 0) - (a.vendor?.reviewAverage ?? 0);
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
        CustomerMapper.toTopPickProductCard(product),
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

}