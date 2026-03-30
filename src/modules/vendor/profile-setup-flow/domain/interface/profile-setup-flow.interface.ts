import { SetupProfileDto } from "../../presentation/dto/profile-setup-flow.dto";

export interface IVendorRepository {
  
  updateProfileAndSyncRelations(
    vendorId: string,
    data: SetupProfileDto,
    imageUrl?: string,
  ): Promise<void>;
}