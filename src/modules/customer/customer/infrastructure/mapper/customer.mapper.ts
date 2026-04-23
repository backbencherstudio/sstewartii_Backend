import { CustomerEntity } from '../../domain/entities/customer.entity';
import {
  CustomerResponseDto,
  NearbyVendorCardResponseDto,
  ExploreMapPinResponseDto,
  ExploreMapCardResponseDto,
  FoodCardResponseDto,
  FavoriteProductItemResponseDto,
} from '../../presentation/dto/customer.response.dto';

import { TopPickProductCardResponseDto } from '../../presentation/dto/customer.response.dto';

export class CustomerMapper {
  static toResponse(entity: CustomerEntity): CustomerResponseDto {
    return {
      id: entity.id,
      latitude: entity.latitude,
      longitude: entity.longitude,
      address: entity.address,
    };
  }

  static toNearbyVendorCard(vendor: any): NearbyVendorCardResponseDto {
    return {
      id: vendor.id,
      businessName: vendor.businessName ?? 'Unnamed Vendor',
      coverImage:
        vendor.coverImage ??
        vendor.products?.[0]?.images?.[0]?.url ??
        undefined,
      distanceKm: Number(vendor.distanceKm.toFixed(1)),
      cityLabel: CustomerMapper.extractCityLabel(vendor.serviceArea?.address),
      isOpen: vendor.availability?.isOpen ?? false,
      statusLabel: vendor.availability?.label ?? 'Unknown',
      cuisines: vendor.cuisines?.map((item: any) => item.cuisine.name) ?? [],

      rating: Number((vendor.reviewAverage ?? 0).toFixed(1)),
      reviewCount: vendor.reviewCount ?? 0,
    };
  }

  private static extractCityLabel(
    address?: string | null,
  ): string | undefined {
    if (!address) {
      return undefined;
    }

    return address.split(',')[0]?.trim() || undefined;
  }

  static toTopPickProductCard(product: any): TopPickProductCardResponseDto {
    return {
      id: product.id,
      name: product.name,
      image: product.images?.[0]?.url ?? undefined,
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

  static toFoodCard(product: any): FoodCardResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.images?.[0]?.url ?? undefined,

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

  static toFavoriteProductItem(item: any): FavoriteProductItemResponseDto {
    const product = item.product;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.images?.[0]?.url ?? undefined,

      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName ?? 'Unnamed Vendor',

      categoryName: product.category?.name ?? undefined,

      rating: Number((product.vendor?.reviewAverage ?? 0).toFixed(1)),
      reviewCount: product.vendor?.reviewCount ?? 0,

      isFavorited: true,
    };
  }
}