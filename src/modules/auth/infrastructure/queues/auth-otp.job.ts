export type AuthOtpJobType =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'DELETE_ACCOUNT'
  | 'RECOVER_ACCOUNT';

export interface AuthOtpJobPayload {
  userId: string;
  email: string;
  type: AuthOtpJobType;
  otp?: string; // Optional - for storing OTP
  hashedOtp?: string; // Optional - for storing hashed OTP
  expiresAt?: Date; // Optional - for storing expiration
}
