import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '@/modules/auth/decorators/get-user.decorator';
import type { AuthUser } from '@/modules/auth/domain/interfaces/auth-user.interface';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { ReviewService } from '../../application/review.service';
import { CreateReviewDto } from '../dto/review.dto';
import { CreateReviewResponseDto } from '../dto/review.response.dto';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';


@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('create-review')
  @UseInterceptors(FilesInterceptor('images', 5))
  @UseGuards(RoleGuard)
  @Roles(Role.USER) 
  @ResponseMessage('Review submitted successfully.')
  async createReview(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CreateReviewResponseDto> {
    return this.reviewService.createReview(user.id, dto, files);
  }
}