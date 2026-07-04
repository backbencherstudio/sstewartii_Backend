import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CreateHelpTicketDto } from '../dto/help-center.dto';
import { HelpTicketResponseDto } from '../dto/help-center.response.dto';

import { HelpCenterService } from '../../application/help-center.service';

import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { RoleGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';

@Controller('help-center')
export class HelpCenterController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  @Post('tickets')
  @UseGuards(RoleGuard)
  @Roles(Role.USER, Role.VENDOR)
  @ResponseMessage('Help request submitted successfully.')
  async createTicket(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateHelpTicketDto,
  ): Promise<HelpTicketResponseDto> {
    return this.helpCenterService.createTicket(user.id, dto);
  }
}
