import {Injectable} from '@nestjs/common';
import {
  KycStatus,
  SubscriptionStatus,
  VerificationStatus,
} from '@prisma/client';

import { 
  UploadTruckGalleryResponseDto,
  TruckGalleryResponseDto,
  VendorHomeResponseDto,
  VendorMenuItemsResponseDto,
  VendorMenuItemStatusResponseDto,
  DeleteVendorMenuItemResponseDto,
  VendorReviewRatingDistributionDto,
  VendorReviewsResponseDto,
  VendorMenuResponseDto,
  VendorInfoResponseDto,
  VendorFollowersResponseDto,
  VendorMenuDetailResponseDto ,
} from '../../presentation/dto/vendor.response.dto';

import {
  VendorInsightAccessDto,
} from '../../presentation/dto/vendor-insights.response.dto';

import type {
  VendorTruckGalleryView,
  VendorFollowerRowView,
} from '../../domain/interface/vendor.repository.interface';

import { Vendor } from '../../domain/entities/vendor.entity';
import { MediaService } from '@/common/media/media.service';

@Injectable()
export class VendorMapper {
  constructor(private readonly mediaService: MediaService) {}

  static toDomain(raw: any): Vendor {

    return new Vendor({
      id: raw.id,
      ownerId: raw.ownerId,

      businessName: raw.businessName ?? undefined,
      publicEmail: raw.publicEmail ?? undefined,
      contactNumber: raw.contactNumber ?? undefined,
      bio: raw.bio ?? undefined,

      coverImage: raw.coverImage ?? undefined,

      onboardingStep: raw.onboardingStep ?? 1,

      subscriptionExpiry: raw.subscriptionExpiry ?? null,

      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt, 
    });
  }

 toMenuResponse(
    vendor: any,
    extra: {
      distanceKm?: number;
      isOpen: boolean;
      statusLabel: string;
      cityLabel?: string;
    },
  ): VendorMenuDetailResponseDto {
    const grouped = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        products: {
          id: string;
          name: string;
          description: string;
          price: number;
          estimateCookTime: number;
          image?: string;
          categoryName?: string;
        }[];
      }
    >();

    for (const product of vendor.products ?? []) {
      const categoryId = product.category?.id ?? 'uncategorized';
      const categoryName = product.category?.name ?? 'Uncategorized';

      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, {
          categoryId,
          categoryName,
          products: [],
        });
      }

      grouped.get(categoryId)!.products.push({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        estimateCookTime: product.estimateCookTime,
        image: product.images?.[0]?.url
          ? this.mediaService.getUrl(product.images[0].url)
          : undefined,
        categoryName,
      });
    }

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName ?? 'Unnamed Vendor',
        coverImage: vendor.coverImage
          ? this.mediaService.getUrl(vendor.coverImage)
          : undefined,
        bio: vendor.bio ?? undefined,
        cityLabel: extra.cityLabel,
        distanceKm:
          extra.distanceKm !== undefined
            ? Number(extra.distanceKm.toFixed(1))
            : undefined,
        isOpen: extra.isOpen,
        statusLabel: extra.statusLabel,
        reviewAverage: Number((vendor.truckReviewAverage ?? 0).toFixed(1)),
        reviewCount: vendor.truckReviewCount ?? 0,
        cuisines:
          vendor.cuisines?.map((item: any) => item.cuisine.name) ?? [],
      },
      sections: Array.from(grouped.values()),
    };
  }
  
  static toInfoResponse(vendor: any): VendorInfoResponseDto {
    return {
      id: vendor.id,
      bio: vendor.bio ?? undefined,
      publicEmail: vendor.publicEmail ?? undefined,
      contactNumber: vendor.contactNumber ?? undefined,
      address: vendor.serviceArea?.address ?? undefined,
      latitude: vendor.serviceArea?.latitude ?? undefined,
      longitude: vendor.serviceArea?.longitude ?? undefined,
      radius: vendor.serviceArea?.radius ?? undefined,
      openingHours: (vendor.operationHours ?? []).map((item: any) => ({
        dayOfWeek: item.dayOfWeek,
        dayLabel: VendorMapper.getDayLabel(item.dayOfWeek),
        openTime: item.openTime,
        closeTime: item.closeTime,
        isClosed: item.isClosed,
      })),
      socialLinks: (vendor.socialLinks ?? []).map((item: any) => ({
        platform: VendorMapper.detectSocialPlatform(item.url),
        url: item.url,
      })),
    };
  }

  private static getDayLabel(dayOfWeek: number): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    return days[dayOfWeek] ?? 'Unknown';
  }

  private static detectSocialPlatform(url?: string | null): string {
    if (!url) {
      return 'Website';
    }

    const normalized = url.toLowerCase();

    if (normalized.includes('instagram.com')) return 'Instagram';
    if (normalized.includes('facebook.com')) return 'Facebook';
    if (normalized.includes('tiktok.com')) return 'TikTok';
    if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) {
      return 'YouTube';
    }
    if (normalized.includes('twitter.com') || normalized.includes('x.com')) {
      return 'Twitter';
    }
    if (normalized.includes('whatsapp.com') || normalized.includes('wa.me')) {
      return 'WhatsApp';
    }

    return 'Website';
  } 

  static toUploadTruckGalleryResponse(): UploadTruckGalleryResponseDto {
    return {
      message: 'Truck gallery images uploaded successfully',
    };
  }

  // toTruckGalleryResponse(vendor: {
  //   id: string;
  //   truckGalleryImages: {
  //     id: string;
  //     url: string;
  //     caption: string | null;
  //     isPrimary: boolean;
  //     position: number;
  //     createdAt: Date;
  //   }[];
  // }): TruckGalleryResponseDto {
  //   return {
  //     vendorId: vendor.id,
  //     items: vendor.truckGalleryImages.map((image) => ({
  //       id: image.id,
  //       url: this.mediaService.getUrl(image.url),
  //       caption: image.caption ?? undefined,
  //       isPrimary: image.isPrimary,
  //       position: image.position,
  //       createdAt: image.createdAt,
  //     })),
  //   };
  // }

  toVendorHomeResponse(data: {
    vendor: any;
    stats: {
      todaySale: number;
      ordersCompleted: number;
      pendingOrders: number;
      cancelledOrders: number;
    };
    unreadNotificationCount: number;
    isLive: boolean;
  }): VendorHomeResponseDto {
      const vendor = data.vendor;

      const kycApproved = vendor.kycStatus === KycStatus.APPROVED;

      const businessApproved =
        vendor.vendorVerification?.status === VerificationStatus.APPROVED;

      const subscriptionActive =
        vendor.subscriptionStatus === SubscriptionStatus.ACTIVE;

      const canGoLive = kycApproved && businessApproved && subscriptionActive;

      const actionRequired = !canGoLive;

      return {
        vendor: {
          id: vendor.id,
          businessName: vendor.businessName ?? 'Unnamed Vendor',
          coverImage: this.mediaService.getUrl( vendor.coverImage),
          address: vendor.serviceArea?.address ?? undefined,
          latitude: vendor.serviceArea?.latitude ?? undefined,
          longitude: vendor.serviceArea?.longitude ?? undefined,
        },

        verification: {
          isLimitedMode: !canGoLive,
          kycStatus: vendor.kycStatus,
          businessVerificationStatus:
            vendor.vendorVerification?.status ?? undefined,
          subscriptionStatus: vendor.subscriptionStatus,
          onboardingStep: vendor.onboardingStep,
          actionRequired,
          title: actionRequired ? 'Action Required' : undefined,
          message: actionRequired
            ? 'Your account is currently in "Limited Mode". To start accepting order requests and accessing the marketplace, please complete your identity and fleet verification.'
            : undefined,
          buttonText: actionRequired ? 'Complete Verification' : undefined,
        },

        liveStatus: {
          canGoLive,
          isLive: canGoLive ? data.isLive : false,
          disabledReason: canGoLive
            ? undefined
            : 'Verify account to toggle status',
        },

        stats: {
          todaySale: Number(data.stats.todaySale.toFixed(2)),
          ordersCompleted: data.stats.ordersCompleted,
          pendingOrders: data.stats.pendingOrders,
          cancelledOrders: data.stats.cancelledOrders,
        },

        currentLocation: vendor.serviceArea
          ? {
              address: vendor.serviceArea.address ?? undefined,
              latitude: vendor.serviceArea.latitude,
              longitude: vendor.serviceArea.longitude,
              radius: vendor.serviceArea.radius,
            }
          : undefined,

        unreadNotificationCount: data.unreadNotificationCount,
      };
    }

  toMenuCategoriesResponse(vendor: any): VendorMenuResponseDto {
    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        products: any[];
      }
    >();

    const uncategorizedKey = 'uncategorized';

    for (const product of vendor.products ?? []) {
      const categoryId = product.category?.id ?? uncategorizedKey;
      const categoryName = product.category?.name ?? 'Uncategorized';

      const existing = categoryMap.get(categoryId);

      if (existing) {
        existing.products.push(product);
      } else {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          products: [product],
        });
      }
    }

    const categories = Array.from(categoryMap.values()).map((category) => ({
      id: category.id,
      name: category.name,
      itemCount: category.products.length,
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        estimateCookTime: product.estimateCookTime,
        isActive: product.isActive,

        cuisine: product.cuisine
          ? {
              id: product.cuisine.id,
              name: product.cuisine.name,
              imageUrl: product.cuisine.imageUrl
                ? this.resolveMediaUrl(product.cuisine.imageUrl)
                : undefined,
            }
          : undefined,

        images: (product.images ?? []).map((image: any) => ({
          id: image.id,
          url: image.url ? this.resolveMediaUrl(image.url) : undefined,
          isPrimary: image.isPrimary,
          position: image.position,
        })),
      })),
    }));

    return {
      totalCategories: categories.length,
      totalItems: (vendor.products ?? []).length,
      categories,
    };
  }

  toMenuItemsResponse(data: {
    total: number;
    page: number;
    limit: number;
    items: any[];
  }): VendorMenuItemsResponseDto {
    return {
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages:
        data.total === 0 ? 0 : Math.ceil(data.total / data.limit),

      items: data.items.map((product: any) => {
        const firstImage = product.images?.[0];

        return {
          id: product.id,
          name: product.name,
          description: product.description ?? undefined,

          price: product.price,
          estimateCookTime: product.estimateCookTime,

          image: firstImage?.url
            ? this.mediaService.getUrl(firstImage.url)
            : undefined,

          category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
              }
            : undefined,

          isActive: product.isActive,
          availabilityLabel: product.isActive ? 'Available' : 'Unavailable',

          createdAt: product.createdAt,
        };
      }),
    };
  }

  toMenuItemStatusResponse(product: any): VendorMenuItemStatusResponseDto {
    return {
      id: product.id,
      name: product.name,
      isActive: product.isActive,
      availabilityLabel: product.isActive ? 'Available' : 'Unavailable',
    };
  }

  toDeleteVendorMenuItemResponse(
    product: {
      id: string;
      isDeleted: boolean;
      deletedAt: Date | null;
    },
  ): DeleteVendorMenuItemResponseDto {
    return {
      id: product.id,
      deleted: product.isDeleted,
      deletedAt: product.deletedAt,
    };
  }

  toResponse(vendor: VendorTruckGalleryView): TruckGalleryResponseDto {
    return {
      vendorId: vendor.id,
      isPublic: true,
      total: vendor.truckGalleryImages.length,
      images: vendor.truckGalleryImages.map((image) => ({
        id: image.id,
        url: this.resolveImageUrl(image.url),
        caption: image.caption ?? undefined,
        isPrimary: image.isPrimary,
        position: image.position,
        createdAt: image.createdAt,
      })),
    };
  }

  private resolveImageUrl(path: string): string {
    return this.mediaService.getUrl(path) ?? path;
  }

  toRviewResponse(data: {
    summary: {
      averageRating: number;
      totalReviews: number;
      ratingCounts: {
        rating: number;
        count: number;
      }[];
    };
    total: number;
    page: number;
    limit: number;
    sort: 'MOST_RECENT' | 'HIGHEST_RATED' | 'LOWEST_RATED';
    reviews: any[];
  }): VendorReviewsResponseDto {
    return {
      summary: {
        averageRating: Number(data.summary.averageRating.toFixed(1)),
        totalReviews: data.summary.totalReviews,
        distribution: this.buildRatingDistribution(
          data.summary.ratingCounts,
          data.summary.totalReviews,
        ),
      },

      sort: data.sort,

      pagination: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages:
          data.total === 0 ? 0 : Math.ceil(data.total / data.limit),
      },

      reviews: data.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        reviewText: review.reviewText ?? undefined,

        customer: {
          id: review.customer.id,
          name:
            review.customer.user?.name ??
            review.customer.user?.email ??
            'Customer',
          avatar: review.customer.avatar
            ? this.resolveMediaUrl(review.customer.avatar)
            : undefined,
        },

        tags: review.tags.map((entry: any) => ({
          id: entry.tag.id,
          name: entry.tag.name,
        })),

        images: review.images.map((image: any) => ({
          id: image.id,
          imageUrl: this.resolveMediaUrl(image.imageUrl),
          position: image.position,
        })),

        createdAt: review.createdAt,
        dateLabel: this.formatDate(review.createdAt),
      })),
    };
  }

  private buildRatingDistribution(
    ratingCounts: {
      rating: number;
      count: number;
    }[],
    totalReviews: number,
  ): VendorReviewRatingDistributionDto[] {
    const countMap = new Map<number, number>();

    for (const item of ratingCounts) {
      countMap.set(item.rating, item.count);
    }

    return [5, 4, 3, 2, 1].map((rating) => {
      const count = countMap.get(rating) ?? 0;

      return {
        rating,
        count,
        percent: totalReviews
          ? Math.round((count / totalReviews) * 100)
          : 0,
      };
    });
  }

  private resolveMediaUrl(path: string): string {
    return this.mediaService.getUrl(path) ?? path;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  toLockedResponse(data: {
    access: VendorInsightAccessDto;
    page: number;
    limit: number;
    message: string;
  }): VendorFollowersResponseDto {
    return {
      access: data.access,
      locked: true,
      lockedMessage: data.message,

      summary: {
        totalFollowers: 0,
        thisMonthFollowers: 0,
        previousMonthFollowers: 0,
        growthPercent: 0,
        growthLabel: 'Locked',
      },

      pagination: {
        total: 0,
        page: data.page,
        limit: data.limit,
        totalPages: 0,
      },

      followers: [],
    };
  }

  toFollowerResponse(data: {
    access: VendorInsightAccessDto;
    totalFollowers: number;
    thisMonthFollowers: number;
    previousMonthFollowers: number;
    total: number;
    page: number;
    limit: number;
    followers: VendorFollowerRowView[];
  }): VendorFollowersResponseDto {
    return {
      access: data.access,
      locked: false,

      summary: {
        totalFollowers: data.totalFollowers,
        thisMonthFollowers: data.thisMonthFollowers,
        previousMonthFollowers: data.previousMonthFollowers,
        growthPercent: this.calculateGrowthPercent(
          data.thisMonthFollowers,
          data.previousMonthFollowers,
        ),
        growthLabel: 'this month',
      },

      pagination: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages:
          data.total === 0 ? 0 : Math.ceil(data.total / data.limit),
      },

      followers: data.followers.map((follower) => {
        const orderCount = follower.customer.orders.length;

        return {
          id: follower.id,

          customer: {
            id: follower.customer.id,
            name:
              follower.customer.user.name ??
              follower.customer.user.email ??
              'Customer',
            avatar: follower.customer.avatar
              ? this.resolveMediaUrl(follower.customer.avatar)
              : undefined,
          },

          followedAt: follower.createdAt,
          followerSinceLabel: this.formatFollowerSince(follower.createdAt),

          orderCount,
          orderLabel: `${orderCount} ${orderCount === 1 ? 'Order' : 'Orders'}`,
        };
      }),
    };
  }

  private calculateGrowthPercent(
    current: number,
    previous: number,
  ): number {
    if (previous === 0 && current > 0) {
      return 100;
    }

    if (previous === 0) {
      return 0;
    }

    return Math.round(((current - previous) / previous) * 100);
  }

  private formatFollowerSince(date: Date): string {
    return `Follower since ${new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))}`;
  }
}