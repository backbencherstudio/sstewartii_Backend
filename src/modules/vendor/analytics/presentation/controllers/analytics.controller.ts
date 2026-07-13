// presentation/controllers/analytics.controller.ts
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { IAnalyticsService } from '../../domain/interfaces/analytics.service.interface';
import { ANALYTICS_SERVICE } from '../../domain/interfaces/analytics.service.interface';
import { AnalyticsRequestDto } from '../../application/dtos/analytics-request.dto';
import { AnalyticsMapper } from '../../application/mappers/analytics.mapper';
import { AnalyticsResponseDto } from '../dto/analytics.dto';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { Role } from '@/common/enums/role.enum';
import { Roles } from '@/common/decorators/roles.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';

@ApiTags('Vendor Analytics')
@ApiBearerAuth()
@Controller('vendor/analytics')
@UseGuards(JwtAuthGuard)
@Roles(Role.VENDOR)
export class AnalyticsController {
  constructor(
    @Inject(ANALYTICS_SERVICE)
    private readonly analyticsService: IAnalyticsService,
  ) {}

  @Get()
  @ApiOkResponse({ type: AnalyticsResponseDto })
  async getAnalytics(
    @CurrentUser() user: AuthUser,
    @Query() query: AnalyticsRequestDto,
  ): Promise<AnalyticsResponseDto> {
    const analytics = await this.analyticsService.getVendorAnalytics(
      user.id,
      query.month,
    );
    return AnalyticsMapper.toResponseDto(analytics);
  }
}
