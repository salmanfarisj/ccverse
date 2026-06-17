/**
 * EmailDriver interface — the abstraction layer for transactional email.
 *
 * All email operations in the codebase go through this interface, allowing
 * the underlying driver to be swapped (SES in prod, a mock/null in dev)
 * without changing any call sites.
 */

export interface EmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  html: string;
  text: string;
  tags?: string[];
}

export interface EmailDriver {
  /**
   * Send a single email.
   * @returns The SES message ID (or equivalent from the underlying driver)
   */
  send(msg: EmailMessage): Promise<string>;
}

export interface SendOptions {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  tags?: string[];
}
