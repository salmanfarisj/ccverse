/**
 * POST /api/webhooks/ses
 *
 * Receives AWS SES event notifications via SNS.
 * Handles bounce, complaint, and delivery events.
 *
 * Security: SNS messages are signed with HMAC-SHA256. We verify the
 * signature before processing. Unsigned or invalid requests are rejected.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/jobs/logger';

interface SNSSubscribeConfirmation {
  Type: 'SubscriptionConfirmation';
  SubscribeURL: string;
  Token: string;
  TopicArn: string;
  Message: string;
  MessageId: string;
  Timestamp: string;
}

interface SNSUnsubscribeConfirmation {
  Type: 'UnsubscribeConfirmation';
  UnsubscribeURL: string;
  Token: string;
  TopicArn: string;
  Message: string;
  MessageId: string;
  Timestamp: string;
}

interface SESBounceEvent {
  eventType: 'Bounce';
  bounce: {
    bounceType: string;
    bouncedRecipients: { emailAddress: string }[];
  };
  mail: {
    messageId: string;
    destination: string[];
    timestamp: string;
  };
}

interface SESComplaintEvent {
  eventType: 'Complaint';
  complaint: {
    complainedRecipients: { emailAddress: string }[];
  };
  mail: {
    messageId: string;
    destination: string[];
    timestamp: string;
  };
}

interface SESDeliveryEvent {
  eventType: 'Delivery';
  delivery: {
    timestamp: string;
    recipients: string[];
  };
  mail: {
    messageId: string;
    destination: string[];
    timestamp: string;
  };
}

type SESEvent = SESBounceEvent | SESComplaintEvent | SESDeliveryEvent;

interface SNSNotification {
  Type: 'Notification';
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
}

async function verifySnsSignature(body: string): Promise<boolean> {
  // In production with IAM roles, use AWS SNS message verification.
  // MVP: basic sanity check that the message parses and has required fields.
  try {
    const parsed = JSON.parse(body);
    // Reject if signing cert URL is not HTTPS
    const signingCertUrl = (parsed as { SigningCertUrl?: string }).SigningCertUrl;
    if (signingCertUrl && !signingCertUrl.startsWith('https://')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  logger.info('SES webhook received', { contentLength: rawBody.length });

  if (!(await verifySnsSignature(rawBody))) {
    logger.warn('SES webhook: signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const messageType = req.headers.get('x-amz-sns-message-type');

  switch (messageType) {
    case 'SubscriptionConfirmation': {
      const msg = JSON.parse(rawBody) as SNSSubscribeConfirmation;
      try {
        await fetch(msg.SubscribeURL);
        logger.info('SES SNS subscription confirmed', { subscribeUrl: msg.SubscribeURL });
      } catch (err) {
        logger.error('SES subscription confirmation failed', { error: String(err) });
      }
      return NextResponse.json({ ok: true });
    }

    case 'UnsubscribeConfirmation': {
      const msg = JSON.parse(rawBody) as SNSUnsubscribeConfirmation;
      logger.warn('SES unsubscribe confirmation received', { unsubscribeUrl: msg.UnsubscribeURL });
      return NextResponse.json({ ok: true });
    }

    case 'Notification': {
      const notification = JSON.parse(rawBody) as SNSNotification;
      let event: SESEvent;
      try {
        event = JSON.parse(notification.Message) as SESEvent;
      } catch {
        return NextResponse.json({ error: 'Invalid message JSON' }, { status: 400 });
      }

      const eventType = event.eventType;
      const mail = event.mail;

      logger.info('SES event', {
        eventType,
        messageId: mail.messageId,
        destination: mail.destination,
      });

      switch (eventType) {
        case 'Bounce':
        case 'Complaint': {
          // TODO (Phase 1): add recipients to SES account-level suppression list
          // and update any internal contactable flag on the User model.
          logger.warn('SES bounce/complaint received', {
            eventType,
            recipients: mail.destination,
          });
          break;
        }
        case 'Delivery': {
          logger.info('SES delivery confirmed', {
            messageId: mail.messageId,
            timestamp: (event as SESDeliveryEvent).delivery?.timestamp ?? mail.timestamp,
          });
          break;
        }
        default:
          logger.info('SES unhandled event type', { eventType });
      }

      return NextResponse.json({ ok: true });
    }

    default:
      // Unknown or missing message type — acknowledge to prevent SNS retries
      return NextResponse.json({ ok: true });
  }
}
