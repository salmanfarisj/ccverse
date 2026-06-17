/**
 * SesDriver — AWS SES v2 email driver.
 *
 * Uses `@aws-sdk/client-sesv2`. All sends are tagged with the configured
 * configuration set for event capture (bounce, complaint, delivery).
 * Server-side encryption is enforced at the SES account level.
 */

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { getEnv } from '@/lib/env';
import type { EmailDriver, EmailMessage } from './driver';
import { logger } from '@/jobs/logger';

export class SesDriver implements EmailDriver {
  private readonly client: SESv2Client;
  private readonly senderDomain: string;
  private readonly configurationSet: string;

  constructor() {
    const env = getEnv();
    this.senderDomain = env.SES_SENDER_DOMAIN;
    this.configurationSet = env.SES_CONFIGURATION_SET;

    // Dev mode: no static credentials configured — use anonymous credentials.
    // The client will still be constructed; actual sends are guarded in send().
    const isDev = !env.SES_ACCESS_KEY_ID || !env.SES_SECRET_ACCESS_KEY;

    this.client = new SESv2Client({
      region: env.SES_REGION,
      credentials: isDev
        ? { accessKeyId: 'devkey', secretAccessKey: 'devsecret' }
        : {
            accessKeyId: env.SES_ACCESS_KEY_ID,
            secretAccessKey: env.SES_SECRET_ACCESS_KEY,
          },
    });

    this.isDev = isDev;

    logger.info('SesDriver initialised', {
      region: env.SES_REGION,
      senderDomain: this.senderDomain,
      configurationSet: this.configurationSet,
      devMode: isDev,
    });
  }

  private readonly isDev: boolean = false;

  async send(msg: EmailMessage): Promise<string> {
    const toAddresses = Array.isArray(msg.to) ? msg.to : [msg.to];

    // Dev mode: no real SES credentials — log and return a fake ID instead of throwing.
    if (this.isDev) {
      logger.warn('[SesDriver] Dev mode — email not sent', {
        to: toAddresses,
        subject: msg.subject,
        tags: msg.tags,
      });
      return `dev-${Date.now()}-mock`;
    }

    const command = new SendEmailCommand({
      FromEmailAddress: msg.from ?? `noreply@${this.senderDomain}`,
      Destination: {
        ToAddresses: toAddresses,
      },
      Content: {
        Simple: {
          Subject: {
            Data: msg.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: msg.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: msg.text,
              Charset: 'UTF-8',
            },
          },
        },
      },
      // Tag sends with the configuration set for event capture
      ConfigurationSetName: this.configurationSet,
      // Custom email tags for tracking
      EmailTags: (msg.tags ?? []).map((tag) => ({ Name: 'template', Value: tag })),
    });

    const result = await this.client.send(command);
    const messageId = result.MessageId ?? 'unknown';

    logger.info('Email sent', {
      messageId,
      to: toAddresses,
      subject: msg.subject,
      tags: msg.tags,
    });

    return messageId;
  }
}
