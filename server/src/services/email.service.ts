import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface InAppEmailMessage {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  sentAt: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  // In-app mailbox for local dev & demo inspection without needing real SMTP credentials
  private devMailbox: InAppEmailMessage[] = [];

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransporter({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user, pass },
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const message: InAppEmailMessage = {
      id: `mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
      sentAt: new Date().toISOString(),
    };

    // Store in dev mailbox
    this.devMailbox.unshift(message);
    if (this.devMailbox.length > 50) this.devMailbox.pop();

    console.log(`[EmailService] Dispatched email to ${options.to}: "${options.subject}"`);

    // If real transporter is configured, attempt sending
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || 'SPIT Attend <noreply@spit.edu.in>',
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
      } catch (err) {
        console.warn('[EmailService] SMTP delivery error (stored in dev inbox):', err);
      }
    }

    return true;
  }

  getDevMailbox(): InAppEmailMessage[] {
    return this.devMailbox;
  }

  clearDevMailbox(): void {
    this.devMailbox = [];
  }
}
