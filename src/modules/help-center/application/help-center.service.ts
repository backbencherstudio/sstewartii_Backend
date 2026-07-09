// src/modules/help-center/application/help-center.service.ts

import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { HelpTicketUserType } from '@prisma/client';
import type { IHelpCenterRepository } from '../domain/interface/help-center.repository.interface';
import { CreateHelpTicketDto } from '../presentation/dto/help-center.dto';
import { HelpTicketResponseDto } from '../presentation/dto/help-center.response.dto';
import { HelpCenterMapper } from '../infrastructure/mapper/help-center.mapper';
import { CustomerService } from '@/modules/customer/customer/application/customer.service';
import { VendorService } from '@/modules/vendor/vendor/application/vendor.service';

@Injectable()
export class HelpCenterService {
  constructor(
    @Inject('IHelpCenterRepository')
    private readonly helpCenterRepository: IHelpCenterRepository,
    private readonly customerService: CustomerService,
    private readonly vendorService: VendorService,
    private readonly helpCenterMapper: HelpCenterMapper,
  ) {}

  async createTicket(
    userId: string,
    dto: CreateHelpTicketDto,
  ): Promise<HelpTicketResponseDto> {
    const vendor = await this.vendorService.execute(userId);

    if (vendor) {
      const ticket = await this.helpCenterRepository.createHelpTicket({
        userId,
        customerId: null,
        vendorId: vendor.id,
        userType: HelpTicketUserType.VENDOR,
        subject: dto.subject,
        message: dto.message,
      });

      return this.helpCenterMapper.toResponse(ticket);
    }

    const customer = await this.customerService.findActiveByUserId(userId);

    if (customer) {
      const ticket = await this.helpCenterRepository.createHelpTicket({
        userId,
        customerId: customer.id,
        vendorId: null,
        userType: HelpTicketUserType.CUSTOMER,
        subject: dto.subject,
        message: dto.message,
      });

      return this.helpCenterMapper.toResponse(ticket);
    }

    throw new NotFoundException('Customer or vendor profile not found');
  }
}
