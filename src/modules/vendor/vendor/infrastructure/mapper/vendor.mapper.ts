import { Vendor } from '../../domain/entities/vendor.entity';

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

}