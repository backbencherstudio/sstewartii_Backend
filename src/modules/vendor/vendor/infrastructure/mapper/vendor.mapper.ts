import { Vendor } from '../../domain/entities/vendor.entity';
import { VendorMenuResponseDto } from '../../presentation/dto/vendor.response.dto';

export class VendorMapper {

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

   static toMenuResponse(
    vendor: any,
    extra: {
      distanceKm?: number;
      isOpen: boolean;
      statusLabel: string;
      cityLabel?: string;
    },
  ): VendorMenuResponseDto {
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
        image: product.images?.[0]?.url ?? undefined,
        categoryName,
      });
    }

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName ?? 'Unnamed Vendor',
        coverImage: vendor.coverImage ?? undefined,
        bio: vendor.bio ?? undefined,
        cityLabel: extra.cityLabel,
        distanceKm:
          extra.distanceKm !== undefined
            ? Number(extra.distanceKm.toFixed(1))
            : undefined,
        isOpen: extra.isOpen,
        statusLabel: extra.statusLabel,
        reviewAverage: Number((vendor.reviewAverage ?? 0).toFixed(1)),
        reviewCount: vendor.reviewCount ?? 0,
        cuisines: vendor.cuisines?.map((item: any) => item.cuisine.name) ?? [],
      },
      sections: Array.from(grouped.values()),
    };
  }
}