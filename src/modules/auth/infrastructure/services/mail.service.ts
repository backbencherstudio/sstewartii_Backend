import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string, purpose: 'Verification' | 'Password Reset') {
    try {
      await this.transporter.sendMail({
        from: `"Dalna Support" <${this.configService.get<string>('mail.from')}>`,
        to,
        subject: `Your ${purpose} Code`,
        html: `
          <h2>Hello!</h2>
          <p>Your 6-digit ${purpose} code is:</p>
          <h1 style="color: blue; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
        `,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException('Failed to send email. Please try again later.');
    }
  }
}