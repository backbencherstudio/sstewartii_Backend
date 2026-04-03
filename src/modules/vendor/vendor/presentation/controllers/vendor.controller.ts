import { Controller, Get, Req } from '@nestjs/common';
import { VendorService } from '../../application/vendor.service';

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
}