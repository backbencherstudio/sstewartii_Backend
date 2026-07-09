import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  AUTH_QUEUE,
  SEND_EMAIL_VERIFICATION_OTP_JOB,
  SEND_PASSWORD_RESET_OTP_JOB,
  SEND_DELETE_ACCOUNT_OTP_JOB,
  SEND_RECOVER_ACCOUNT_OTP_JOB,
} from '@/common/queues/queue.constants';
import type { AuthOtpJobPayload } from './auth-otp.job';
import { MailService } from '@/common/mail/mail.service';
import type { IOtpRepository } from '../../domain/interfaces/otp.repository.interface';

@Injectable()
@Processor(AUTH_QUEUE, {
  concurrency: 5,
})
export class AuthOtpProcessor extends WorkerHost {
  private readonly logger = new Logger(AuthOtpProcessor.name);

  constructor(
    @Inject('IOtpRepository')
    private readonly otpRepository: IOtpRepository,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<AuthOtpJobPayload>): Promise<void> {
    switch (job.name) {
      case SEND_EMAIL_VERIFICATION_OTP_JOB:
      case SEND_PASSWORD_RESET_OTP_JOB:
      case SEND_DELETE_ACCOUNT_OTP_JOB:
      case SEND_RECOVER_ACCOUNT_OTP_JOB:
        await this.handleOtpJob(job.data);
        return;

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleOtpJob(data: AuthOtpJobPayload): Promise<void> {
    // ✅ ALWAYS use provided OTP - DO NOT regenerate
    const otp = data.otp;
    const hashedOtp = data.hashedOtp;
    const expiresAt = data.expiresAt;

    // Validate that OTP exists
    if (!otp || !hashedOtp || !expiresAt) {
      this.logger.error(`Missing OTP data for user ${data.userId}`);
      throw new Error('OTP data is missing from job payload');
    }

    // Save OTP to database
    await this.otpRepository.create(
      data.userId,
      hashedOtp,
      data.type,
      expiresAt,
    );

    // Send email with the SAME OTP
    const purposeMap: Record<string, string> = {
      EMAIL_VERIFICATION: 'Verification',
      PASSWORD_RESET: 'Password Reset',
      DELETE_ACCOUNT: 'Account Deletion',
      RECOVER_ACCOUNT: 'Account Recovery',
    };
    const purpose = purposeMap[data.type] as 'Verification' | 'Password Reset';

    // ✅ Send the EXACT SAME OTP that was generated
    await this.mailService.sendOtpEmail(data.email, otp, purpose);

    this.logger.log(
      `OTP email sent successfully. userId=${data.userId}, type=${data.type}, otp=${otp}`,
    );
  }
}
