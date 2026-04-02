import { SetupProfileDto } from "../../presentation/dto/profile-setup-flow.dto";
import { OperationHourDto } from "../../presentation/dto/profile-setup-flow.dto";

export interface IProfileSetupRepository {
  
  updateProfileAndSyncRelations(
    vendorId: string,
    data: SetupProfileDto,
    imageUrl?: string,
  ): Promise<void>;

  upsertOperationHours(
    userId: string, 
    hours:OperationHourDto[]
  ): Promise<void>;
}