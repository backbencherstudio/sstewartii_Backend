import { 
  Controller,
  Get,
  Req,
  Param, 
  Query
} from '@nestjs/common';
import { VendorService } from '../../application/vendor.service';
import { VendorMenuQueryDto } from '../dto/vendor.dto';
import { VendorMenuResponseDto } from '../dto/vendor.response.dto';
@Controller('vendor')
export class VendorController {
  constructor(
    private readonly VendorService: VendorService
  ) {}

  @Get('me')
  async getMyVendor(@Req() req: any) {
    const userId = req.user.sub; 

    return this.VendorService.execute(userId);
  }

  @Get(':vendorId/menu')
  async getVendorMenu(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorMenuQueryDto,
  ): Promise<VendorMenuResponseDto> {
    return this.VendorService.getVendorMenu(vendorId, query);
  }
}