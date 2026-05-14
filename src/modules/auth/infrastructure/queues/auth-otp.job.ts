export type AuthOtpJobType =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET';

export interface AuthOtpJobPayload {
  userId: string;
  email: string;
  type: AuthOtpJobType;
}