import { Injectable } from '@nestjs/common';
import { CustomerEntity } from '../../domain/entities/customer.entity';

import { VendorLiveStatus } from '@prisma/client';

import {
  CustomerResponseDto,
  NearbyVendorCardResponseDto,
  ExploreMapPinResponseDto,
  ExploreMapCardResponseDto,
  FoodCardResponseDto,
  FavoriteProductItemResponseDto,
  FavoriteVendorItemResponseDto,
  AdvancedSearchFoodItemResponseDto,
  AdvancedSearchTruckItemResponseDto,
  TopPickProductCardResponseDto,
} from '../../presentation/dto/customer.response.dto';

import { MediaService } from '@/common/media/media.service';

@Injectable()
export class CustomerMapper {
  constructor(private readonly media: MediaService) {}

  static toResponse(entity: CustomerEntity): CustomerResponseDto {
    return {
      id: entity.id,
      latitude: entity.latitude,
      longitude: entity.longitude,
      address: entity.address,
    };
  }

  toNearbyVendorCard(
    vendor: any,
    favoriteVendorIdSet: Set<string>,
  ): NearbyVendorCardResponseDto {
    const productImage = vendor.products?.[0]?.images?.[0]?.url;

    return {
      id: vendor.id,
      businessName: vendor.businessName ?? 'Unnamed Vendor',

      coverImage:
        this.media.getUrl(vendor.coverImage) ??
        this.media.getUrl(productImage) ??
        undefined,

      distanceKm: Number((vendor.distanceKm ?? 0).toFixed(1)),

      cityLabel: CustomerMapper.extractCityLabel(vendor.serviceArea?.address),

      vendorStatus: vendor.status as VendorLiveStatus,

      isOpen: vendor.availability?.isOpen ?? false,
      statusLabel: vendor.availability?.label ?? 'Closed',

      cuisines: vendor.cuisines?.map((item: any) => item.cuisine.name) ?? [],

      rating: Number((vendor.truckReviewAverage ?? 0).toFixed(1)),
      reviewCount: vendor.truckReviewCount ?? 0,

      isFavorite: favoriteVendorIdSet.has(vendor.id),
    };
  }

  toTopPickProductCard(product: any): TopPickProductCardResponseDto {
    return {
      id: product.id,
      name: product.name,
      image: this.media.getUrl(product.images?.[0]?.url),
      price: product.price,
      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName ?? 'Unnamed Vendor',
      rating: Number((product.vendor?.reviewAverage ?? 0).toFixed(1)),
      reviewCount: product.vendor?.reviewCount ?? 0,
      categoryName: product.category?.name ?? undefined,
      distanceKm: Number(product.distanceKm.toFixed(1)),
    };
  }

  static toExploreMapPin(vendor: any): ExploreMapPinResponseDto {
    return {
      vendorId: vendor.id,
      businessName: vendor.businessName ?? 'Unnamed Vendor',
      latitude: vendor.serviceArea.latitude,
      longitude: vendor.serviceArea.longitude,
      coverImage:
        vendor.coverImage ??
        vendor.products?.[0]?.images?.[0]?.url ??
        undefined,
      rating: Number((vendor.reviewAverage ?? 0).toFixed(1)),
      reviewCount: vendor.reviewCount ?? 0,
      distanceKm: Number(vendor.distanceKm.toFixed(1)),
      isOpen: vendor.availability?.isOpen ?? false,
      statusLabel: vendor.availability?.label ?? 'Unknown',
    };
  }

  static toExploreMapCard(vendor: any): ExploreMapCardResponseDto {
    return {
      vendorId: vendor.id,
      businessName: vendor.businessName ?? 'Unnamed Vendor',
      coverImage:
        vendor.coverImage ??
        vendor.products?.[0]?.images?.[0]?.url ??
        undefined,
      cuisines: vendor.cuisines?.map((item: any) => item.cuisine.name) ?? [],
      rating: Number((vendor.reviewAverage ?? 0).toFixed(1)),
      reviewCount: vendor.reviewCount ?? 0,
      distanceKm: Number(vendor.distanceKm.toFixed(1)),
      isOpen: vendor.availability?.isOpen ?? false,
      statusLabel: vendor.availability?.label ?? 'Unknown',
      cityLabel: CustomerMapper.extractCityLabel(vendor.serviceArea?.address),
    };
  }

  toFoodCard(product: any): FoodCardResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,

      image: this.media.getUrl(product.images?.[0]?.url) ?? undefined,

      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName ?? 'Unnamed Vendor',

      categoryName: product.category?.name ?? undefined,
      cuisines:
        product.vendor?.cuisines?.map((item: any) => item.cuisine.name) ?? [],

      rating: Number((product.vendor?.reviewAverage ?? 0).toFixed(1)),
      reviewCount: product.vendor?.reviewCount ?? 0,

      distanceKm: Number(product.distanceKm.toFixed(1)),
      isOpen: product.availability?.isOpen ?? false,
      statusLabel: product.availability?.label ?? 'Unknown',
    };
  }

  toFavoriteProductItem(item: any): FavoriteProductItemResponseDto {
    const product = item.product;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: this.media.getUrl(product.images?.[0]?.url),

      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName ?? 'Unnamed Vendor',

      categoryName: product.category?.name ?? undefined,

      rating: Number((product.vendor?.reviewAverage ?? 0).toFixed(1)),
      reviewCount: product.vendor?.reviewCount ?? 0,

      isFavorited: true,
    };
  }

  toFavoriteVendorItem(item: any): FavoriteVendorItemResponseDto {
    const vendor = item.vendor;

    return {
      id: vendor.id,
      businessName: vendor.businessName ?? 'Unnamed Vendor',
      coverImage: this.media.getUrl(
        vendor.coverImage ?? vendor.products?.[0]?.images?.[0]?.url,
      ),

      cuisines: vendor.cuisines?.map((entry: any) => entry.cuisine.name) ?? [],

      rating: Number((vendor.reviewAverage ?? 0).toFixed(1)),
      reviewCount: vendor.reviewCount ?? 0,

      cityLabel: CustomerMapper.extractCityLabel(vendor.serviceArea?.address),

      distanceKm:
        item.distanceKm !== undefined
          ? Number(item.distanceKm.toFixed(1))
          : undefined,

      isOpen: item.availability?.isOpen ?? false,
      statusLabel: item.availability?.label ?? 'Unknown',

      isFavorited: true,
    };
  }

  toAdvancedFoodItem(
    product: any,
    favoriteProductIds: Set<string>,
  ): AdvancedSearchFoodItemResponseDto {
    return {
      type: 'FOOD',
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: this.media.getUrl(product.images?.[0]?.url),

      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName ?? 'Unnamed Vendor',

      categoryName: product.category?.name ?? undefined,
      cuisines:
        product.vendor?.cuisines?.map((item: any) => item.cuisine.name) ?? [],

      rating: Number((product.foodReviewAverage ?? 0).toFixed(1)),
      reviewCount: product.foodReviewCount ?? 0,

      distanceKm: Number(product.distanceKm.toFixed(1)),
      isOpen: product.availability?.isOpen ?? false,
      statusLabel: product.availability?.label ?? 'Unknown',

      isFavorited: favoriteProductIds.has(product.id),
    };
  }

  toAdvancedTruckItem(
    vendor: any,
    favoriteVendorIds: Set<string>,
  ): AdvancedSearchTruckItemResponseDto {
    return {
      type: 'TRUCK',
      id: vendor.id,
      businessName: vendor.businessName ?? 'Unnamed Vendor',
      coverImage: this.media.getUrl(
        vendor.coverImage ??
          vendor.truckGalleryImages?.[0]?.url ??
          vendor.products?.[0]?.images?.[0]?.url,
      ),

      cityLabel: CustomerMapper.extractCityLabel(vendor.serviceArea?.address),
      address: vendor.serviceArea?.address ?? undefined,

      cuisines: vendor.cuisines?.map((item: any) => item.cuisine.name) ?? [],

      rating: Number((vendor.truckReviewAverage ?? 0).toFixed(1)),
      reviewCount: vendor.truckReviewCount ?? 0,

      distanceKm: Number(vendor.distanceKm.toFixed(1)),
      isOpen: vendor.availability?.isOpen ?? false,
      statusLabel: vendor.availability?.label ?? 'Unknown',

      isFavorited: favoriteVendorIds.has(vendor.id),
    };
  }

  private static extractCityLabel(address?: string | null): string | undefined {
    if (!address) {
      return undefined;
    }

    return address.split(',')[0]?.trim() || undefined;
  }
}
