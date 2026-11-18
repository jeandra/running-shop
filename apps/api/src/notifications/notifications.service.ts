import { Injectable } from '@nestjs/common';

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  async sendEmail(input: SendEmailInput): Promise<void> {
    const provider = process.env.EMAIL_PROVIDER ?? 'log';
    if (provider === 'log') {
      console.log(`[notifications] email -> ${input.to} | ${input.subject}`);
      return;
    }
    throw new Error(`Provider email tidak didukung: ${provider}`);
  }
}
