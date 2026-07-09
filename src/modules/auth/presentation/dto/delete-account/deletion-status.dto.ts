import { ApiProperty } from '@nestjs/swagger';

export class DeletionStatusDto {
  @ApiProperty({ example: false })
  isScheduled: boolean | undefined;

  @ApiProperty({ example: 25, required: false })
  daysRemaining?: number;

  @ApiProperty({ example: '2026-11-24T00:00:00.000Z', required: false })
  scheduledDate?: Date;

  @ApiProperty({
    enum: ['NOT_SCHEDULED', 'GRACE_PERIOD', 'DELETED'],
    example: 'GRACE_PERIOD',
  })
  status: 'NOT_SCHEDULED' | 'GRACE_PERIOD' | 'DELETED' | undefined;

  @ApiProperty({ example: 5, required: false })
  daysElapsed?: number;

  @ApiProperty({ example: '2026-10-24T00:00:00.000Z', required: false })
  scheduledAt?: Date;

  @ApiProperty({ example: '2026-11-24T00:00:00.000Z', required: false })
  deletionDate?: Date;

  @ApiProperty({
    example: 'Account is in grace period. You have 25 days to recover.',
    required: false,
  })
  message?: string;
}
