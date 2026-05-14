// src/modules/auth/infrastructure/queues/auth-otp.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  AUTH_QUEUE,
  SEND_EMAIL_VERIFICATION_OTP_JOB,
  SEND_PASSWORD_RESET_OTP_JOB,
} from '@/common/queues/queue.constants';
import type { AuthOtpJobPayload } from './auth-otp.job';
import { MailService } from '@/common/mail/mail.service';
import type { IOtpRepository } from '../../domain/interfaces/otp.repository.interface';
import { Inject } from '@nestjs/common';

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
        await this.handleOtpJob(job.data);
        return;

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleOtpJob(data: AuthOtpJobPayload): Promise<void> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.create(
      data.userId,
      hashedOtp,
      data.type,
      expiresAt,
    );

    const purpose =
      data.type === 'EMAIL_VERIFICATION'
        ? 'Verification'
        : 'Password Reset';

    await this.mailService.sendOtpEmail(
      data.email,
      otp,
      purpose,
    );

    this.logger.log(
      `OTP email sent successfully. userId=${data.userId}, type=${data.type}`,
    );
  }
}