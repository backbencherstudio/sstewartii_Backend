export interface IOtpRepository {
  create(
    userId: string,
    otpHash: string,
    type: string,
    expiresAt: Date,
  ): Promise<void>;
  findLatest(
    userId: string,
    type: string,
  ): Promise<{ otp: string; expiresAt: Date } | null>;
  deleteUserOtps(userId: string, type: string): Promise<void>;
}
