import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter!: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async initializeTransporter() {
    // Get mail config from the 'mail' key
    const mailConfig = this.configService.get('mail');

    this.logger.debug('Mail config:', {
      host: mailConfig?.host,
      port: mailConfig?.port,
      user: mailConfig?.user,
      pass: mailConfig?.pass ? '****' : 'NOT SET',
      from: mailConfig?.from,
    });

    // If mailConfig is undefined or missing required fields, check environment variables directly
    const host =
      mailConfig?.host || process.env.MAIL_HOST || process.env.SMTP_HOST;
    const port =
      mailConfig?.port ||
      parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT || '587', 10);
    const user =
      mailConfig?.user || process.env.MAIL_USER || process.env.SMTP_USER;
    const pass =
      mailConfig?.pass || process.env.MAIL_PASS || process.env.SMTP_PASS;
    // const from =
    //   mailConfig?.from ||
    //   process.env.MAIL_FROM ||
    //   process.env.SMTP_FROM ||
    //   '"No Reply" <no-reply@example.com>';

    this.logger.log(
      `Initializing mail transporter with host: ${host}, port: ${port}`,
    );
    this.logger.debug(`MAIL_USER: ${user}`);
    this.logger.debug(`MAIL_PASS: ${pass ? '****' : 'NOT SET'}`);

    // Validate required config
    if (!host || !port || !user || !pass) {
      this.logger.error('Missing email configuration. Please check:');
      this.logger.error(`MAIL_HOST/SMTP_HOST: ${host || 'MISSING'}`);
      this.logger.error(`MAIL_PORT/SMTP_PORT: ${port || 'MISSING'}`);
      this.logger.error(`MAIL_USER/SMTP_USER: ${user || 'MISSING'}`);
      this.logger.error(`MAIL_PASS/SMTP_PASS: ${pass ? 'SET' : 'MISSING'}`);
      throw new Error(
        'Email configuration is incomplete. Please check your .env file.',
      );
    }

    // For Gmail with port 587, use STARTTLS (secure: false)
    const isSecurePort = port === 465;

    try {
      this.transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: isSecurePort,
        auth: {
          user: user,
          pass: pass,
        },
        // For Gmail specifically
        service: host.includes('gmail') ? 'gmail' : undefined,
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false, // Only for testing - remove in production
        },
        // Timeouts
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      // Verify connection
      await this.verifyConnection();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to initialize mail transporter: ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        `Failed to initialize email service: ${errorMessage}`,
      );
    }
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Mail transporter connection verified successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Mail transporter verification failed: ${errorMessage}`,
      );
      // Don't throw error - the service can still attempt to send emails
    }
  }

  async sendOtpEmail(
    to: string,
    otp: string,
    purpose: 'Verification' | 'Password Reset',
  ) {
    try {
      const mailConfig = this.configService.get('mail');
      const from =
        mailConfig?.from ||
        process.env.MAIL_FROM ||
        process.env.SMTP_FROM ||
        '"No Reply" <no-reply@example.com>';

      this.logger.debug(`Sending ${purpose} OTP to ${to}`);

      const info = await this.transporter.sendMail({
        from: `"Sstewartii Support" <${from}>`,
        to,
        subject: `Your ${purpose} Code`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #333;">Hello!</h2>
            <p>Your 6-digit ${purpose} code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #4A90D9; letter-spacing: 8px; font-size: 36px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. Do not share it with anyone.</p>
            <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(
        `✅ OTP email sent successfully to ${to}, MessageId: ${info.messageId}`,
      );
      return info;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Error sending email to ${to}: ${errorMessage}`);

      // Throw error so BullMQ can retry
      throw new InternalServerErrorException(
        `Failed to send email: ${errorMessage}`,
      );
    }
  }

  // Test method for debugging
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Connection verified successfully' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: errorMessage };
    }
  }

  async sendAccountDeletionEmail(to: string, userName: string = 'User') {
    try {
      const from =
        this.configService.get<string>('MAIL_FROM') ||
        this.configService.get<string>('mail.from');

      const info = await this.transporter.sendMail({
        from: `"Sstewartii Support" <${from}>`,
        to,
        subject: 'Your Account Has Been Permanently Deleted',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333;">Hello ${userName},</h2>
          <p>We're writing to confirm that your Sstewartii account has been permanently deleted after the 30-day grace period.</p>
          <p>All your data has been removed from our systems.</p>
          <p>If you wish to use our services again in the future, you'll need to create a new account.</p>
          <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">If you didn't request this deletion, please contact our support immediately.</p>
        </div>
      `,
      });

      this.logger.log(`✅ Account deletion email sent to ${to}`);
      return info;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Failed to send deletion email to ${to}: ${errorMessage}`,
      );
      throw error;
    }
  }
}
