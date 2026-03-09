import { createModuleLogger } from '@/lib/logger';

const log = createModuleLogger('email');

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  /** Plain text fallback */
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using the configured provider.
 *
 * Currently logs the email (no provider configured). To enable real sending:
 *
 * 1. Install a provider: `npm install resend` (or `@sendgrid/mail`)
 * 2. Add API key to .env.local: `RESEND_API_KEY=re_...`
 * 3. Uncomment the Resend implementation below and remove the log-only fallback.
 *
 * This function is safe to call in all environments. It will never throw.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const { to, subject } = payload;

  // --- Resend implementation (uncomment when ready) ---
  // if (process.env.RESEND_API_KEY) {
  //   try {
  //     const { Resend } = await import('resend');
  //     const resend = new Resend(process.env.RESEND_API_KEY);
  //     const { data, error } = await resend.emails.send({
  //       from: process.env.EMAIL_FROM || 'POFlow <notifications@poflow.app>',
  //       to,
  //       subject,
  //       html: payload.html,
  //       text: payload.text,
  //     });
  //     if (error) {
  //       log.error({ to, subject, error: error.message }, 'email send failed');
  //       return { success: false, error: error.message };
  //     }
  //     log.info({ to, subject, messageId: data?.id }, 'email sent');
  //     return { success: true, messageId: data?.id };
  //   } catch (err) {
  //     const msg = err instanceof Error ? err.message : String(err);
  //     log.error({ to, subject, error: msg }, 'email send threw');
  //     return { success: false, error: msg };
  //   }
  // }

  // --- Log-only fallback (no email provider configured) ---
  log.info(
    { to, subject, provider: 'none' },
    'email would be sent (no provider configured)'
  );

  if (process.env.NODE_ENV === 'development') {
    log.debug({ html: payload.html.substring(0, 500) }, 'email preview (truncated)');
  }

  return { success: true, messageId: `local-${Date.now()}` };
}
