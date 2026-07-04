import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  AUTH_QUEUE,
  SEND_EMAIL_VERIFICATION_OTP_JOB,
  SEND_PASSWORD_RESET_OTP_JOB,
} from '@/common/queues/queue.constants';
import type { AuthOtpJobPayload } from './auth-otp.job';

@Injectable()
export class AuthOtpQueueService {
  constructor(
    @InjectQueue(AUTH_QUEUE)
    private readonly authQueue: Queue<AuthOtpJobPayload>,
  ) {}

  async addEmailVerificationOtpJob(data: {
    userId: string;
    email: string;
  }): Promise<void> {
    await this.authQueue.add(
      SEND_EMAIL_VERIFICATION_OTP_JOB,
      {
        userId: data.userId,
        email: data.email,
        type: 'EMAIL_VERIFICATION',
      },
      {
        jobId: `email-verification-${data.userId}-${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async addPasswordResetOtpJob(data: {
    userId: string;
    email: string;
  }): Promise<void> {
    await this.authQueue.add(
      SEND_PASSWORD_RESET_OTP_JOB,
      {
        userId: data.userId,
        email: data.email,
        type: 'PASSWORD_RESET',
      },
      {
        jobId: `password-reset-${data.userId}-${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
