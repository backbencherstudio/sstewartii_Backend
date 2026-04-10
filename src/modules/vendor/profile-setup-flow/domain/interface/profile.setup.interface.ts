import { SetupProfileDto } from "../../presentation/dto/profile-setup-flow.dto";
import { OperationHourDto } from "../../presentation/dto/profile-setup-flow.dto";
import { ServiceAreaDto } from "../../presentation/dto/profile-setup-flow.dto";
import { UpdateServiceAreaDto } from "../../presentation/dto/profile-setup-flow.dto";

export interface IProfileSetupRepository {
  
  updateProfileAndSyncRelations(
    vendorId: string,
    data: SetupProfileDto,
    imageUrl?: string,
  ): Promise<void>;

  createOperationHourVersion(
    userId: string, 
    hours:OperationHourDto[]
  ): Promise<void>;

  upsertServiceArea(
    userId: string,
    data: ServiceAreaDto
  ): Promise<void>;

  updateServiceArea(
    userId: string,
    dto: UpdateServiceAreaDto,
  ): Promise<void> 
  
}