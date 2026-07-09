import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  AUTH_QUEUE,
  SEND_DELETE_ACCOUNT_OTP_JOB,
  SEND_EMAIL_VERIFICATION_OTP_JOB,
  SEND_PASSWORD_RESET_OTP_JOB,
  SEND_RECOVER_ACCOUNT_OTP_JOB,
} from '@/common/queues/queue.constants';
import type { AuthOtpJobPayload } from './auth-otp.job';

@Injectable()
export class AuthOtpQueueService {
  constructor(
    @InjectQueue(AUTH_QUEUE)
    private readonly authQueue: Queue<AuthOtpJobPayload>,
  ) {}

  // Helper to generate OTP
  private async generateOtp(): Promise<{
    otp: string;
    hashedOtp: string;
    expiresAt: Date;
  }> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log('Generated OTP:', otp); // ✅ Debug log

    return { otp, hashedOtp, expiresAt };
  }

  async addEmailVerificationOtpJob(data: {
    userId: string;
    email: string;
  }): Promise<{ otp: string }> {
    const { otp, hashedOtp, expiresAt } = await this.generateOtp();

    await this.authQueue.add(
      SEND_EMAIL_VERIFICATION_OTP_JOB,
      {
        userId: data.userId,
        email: data.email,
        type: 'EMAIL_VERIFICATION',
        otp: otp,
        hashedOtp: hashedOtp,
        expiresAt: expiresAt,
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

    console.log('Email verification OTP returned:', otp); // ✅ Debug log
    return { otp };
  }

  async addPasswordResetOtpJob(data: {
    userId: string;
    email: string;
  }): Promise<{ otp: string }> {
    const { otp, hashedOtp, expiresAt } = await this.generateOtp();

    await this.authQueue.add(
      SEND_PASSWORD_RESET_OTP_JOB,
      {
        userId: data.userId,
        email: data.email,
        type: 'PASSWORD_RESET',
        otp: otp,
        hashedOtp: hashedOtp,
        expiresAt: expiresAt,
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

    return { otp };
  }

  async addDeleteAccountOtpJob(
    payload: Omit<AuthOtpJobPayload, 'type'>,
  ): Promise<{ otp: string }> {
    const { otp, hashedOtp, expiresAt } = await this.generateOtp();

    await this.authQueue.add(
      SEND_DELETE_ACCOUNT_OTP_JOB,
      {
        ...payload,
        type: 'DELETE_ACCOUNT',
        otp: otp,
        hashedOtp: hashedOtp,
        expiresAt: expiresAt,
      },
      {
        jobId: `delete-account-${payload.userId}-${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { otp };
  }

  async addRecoverAccountOtpJob(
    payload: Omit<AuthOtpJobPayload, 'type'>,
  ): Promise<{ otp: string }> {
    const { otp, hashedOtp, expiresAt } = await this.generateOtp();

    await this.authQueue.add(
      SEND_RECOVER_ACCOUNT_OTP_JOB,
      {
        ...payload,
        type: 'RECOVER_ACCOUNT',
        otp: otp,
        hashedOtp: hashedOtp,
        expiresAt: expiresAt,
      },
      {
        jobId: `recover-account-${payload.userId}-${Date.now()}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { otp };
  }
}
