/**
 * Email templates for POFlow notifications.
 *
 * All templates return { subject, html, text } objects ready for sendEmail().
 * HTML uses inline styles for maximum email client compatibility.
 */

const BRAND_COLOR = '#007AFF';
const BRAND_NAME = 'POFlow';

function baseLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" style="margin-bottom:24px;">
          <tr>
            <td style="font-size:20px;font-weight:700;color:${BRAND_COLOR};">
              ${BRAND_NAME}
            </td>
          </tr>
        </table>

        <!-- Body -->
        <table role="presentation" width="100%" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" style="margin-top:24px;">
          <tr>
            <td style="font-size:12px;color:#86868b;text-align:center;line-height:1.6;">
              This email was sent by ${BRAND_NAME}.<br>
              You received this because you have an active account.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(text: string, url: string): string {
  return `<table role="presentation" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND_COLOR};border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

// -------------------------------------------------------
// Template: Welcome / Onboarding
// -------------------------------------------------------

interface WelcomeParams {
  userName: string;
  orgName: string;
  loginUrl: string;
}

export function welcomeEmail(params: WelcomeParams) {
  const { userName, orgName, loginUrl } = params;
  const subject = `Welcome to ${BRAND_NAME} - Let's get started`;

  const html = baseLayout(subject, `
    <h1 style="font-size:22px;font-weight:700;color:#1d1d1f;margin:0 0 16px;">
      Welcome to ${BRAND_NAME}!
    </h1>
    <p style="font-size:14px;color:#424245;line-height:1.6;margin:0 0 8px;">
      Hi ${userName},
    </p>
    <p style="font-size:14px;color:#424245;line-height:1.6;margin:0 0 16px;">
      Your organization <strong>${orgName}</strong> is set up and ready to go. Here's how to get started:
    </p>
    <ol style="font-size:14px;color:#424245;line-height:1.8;padding-left:20px;margin:0 0 16px;">
      <li><strong>Import your product catalog</strong> - Upload your internal SKUs via CSV or add them manually.</li>
      <li><strong>Add your vendors</strong> - Register vendor names and email domains for auto-detection.</li>
      <li><strong>Upload a PO</strong> - Drag and drop a PDF and watch AI extract the data.</li>
      <li><strong>Review and approve</strong> - Verify extracted data, correct if needed, then approve.</li>
    </ol>
    ${buttonHtml('Go to Dashboard', loginUrl)}
    <p style="font-size:13px;color:#86868b;line-height:1.5;margin:0;">
      Need help? Visit the Guide page in your dashboard for a full walkthrough.
    </p>
  `);

  const text = `Welcome to ${BRAND_NAME}!

Hi ${userName},

Your organization "${orgName}" is set up and ready. Get started at: ${loginUrl}

Steps:
1. Import your product catalog (SKUs)
2. Add your vendors
3. Upload a PO (PDF)
4. Review and approve extracted data

Need help? Visit the Guide page in your dashboard.`;

  return { subject, html, text };
}

// -------------------------------------------------------
// Template: PO Processed Successfully
// -------------------------------------------------------

interface POProcessedParams {
  userName: string;
  poNumber: string;
  vendorName: string;
  lineItemCount: number;
  matchedCount: number;
  confidence: number;
  autoApproved: boolean;
  reviewUrl: string;
}

export function poProcessedEmail(params: POProcessedParams) {
  const { userName, poNumber, vendorName, lineItemCount, matchedCount, confidence, autoApproved, reviewUrl } = params;
  const subject = autoApproved
    ? `PO ${poNumber} auto-approved (${confidence}% confidence)`
    : `PO ${poNumber} ready for review`;

  const statusBadge = autoApproved
    ? '<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#d1fae5;color:#065f46;font-size:12px;font-weight:600;">Auto-Approved</span>'
    : '<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;">Needs Review</span>';

  const html = baseLayout(subject, `
    <h1 style="font-size:22px;font-weight:700;color:#1d1d1f;margin:0 0 16px;">
      Purchase Order Processed
    </h1>
    <p style="font-size:14px;color:#424245;line-height:1.6;margin:0 0 16px;">
      Hi ${userName}, a purchase order has been processed:
    </p>
    <table role="presentation" width="100%" style="border:1px solid #e5e5ea;border-radius:8px;overflow:hidden;margin:0 0 16px;">
      <tr>
        <td style="padding:16px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size:13px;color:#86868b;padding-bottom:4px;">PO Number</td>
              <td style="font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;padding-bottom:4px;">${poNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#86868b;padding-bottom:4px;">Vendor</td>
              <td style="font-size:14px;color:#1d1d1f;text-align:right;padding-bottom:4px;">${vendorName}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#86868b;padding-bottom:4px;">Line Items</td>
              <td style="font-size:14px;color:#1d1d1f;text-align:right;padding-bottom:4px;">${lineItemCount}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#86868b;padding-bottom:4px;">Parts Matched</td>
              <td style="font-size:14px;color:#1d1d1f;text-align:right;padding-bottom:4px;">${matchedCount} / ${lineItemCount}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#86868b;padding-bottom:4px;">Confidence</td>
              <td style="font-size:14px;font-weight:600;color:${confidence >= 85 ? '#065f46' : confidence >= 70 ? '#92400e' : '#991b1b'};text-align:right;padding-bottom:4px;">${confidence}%</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#86868b;">Status</td>
              <td style="text-align:right;">${statusBadge}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${autoApproved ? '' : buttonHtml('Review Now', reviewUrl)}
  `);

  const text = `Purchase Order Processed

Hi ${userName},

PO Number: ${poNumber}
Vendor: ${vendorName}
Line Items: ${lineItemCount}
Parts Matched: ${matchedCount} / ${lineItemCount}
Confidence: ${confidence}%
Status: ${autoApproved ? 'Auto-Approved' : 'Needs Review'}

${autoApproved ? '' : `Review at: ${reviewUrl}`}`;

  return { subject, html, text };
}

// -------------------------------------------------------
// Template: Extraction Failed / Needs Review
// -------------------------------------------------------

interface ExtractionFailedParams {
  userName: string;
  fileName: string;
  errorMessage: string;
  uploadUrl: string;
}

export function extractionFailedEmail(params: ExtractionFailedParams) {
  const { userName, fileName, errorMessage, uploadUrl } = params;
  const subject = `PO extraction failed: ${fileName}`;

  const html = baseLayout(subject, `
    <h1 style="font-size:22px;font-weight:700;color:#1d1d1f;margin:0 0 16px;">
      Extraction Failed
    </h1>
    <p style="font-size:14px;color:#424245;line-height:1.6;margin:0 0 16px;">
      Hi ${userName}, we were unable to extract data from your uploaded file:
    </p>
    <table role="presentation" width="100%" style="border:1px solid #e5e5ea;border-radius:8px;overflow:hidden;margin:0 0 16px;">
      <tr>
        <td style="padding:16px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size:13px;color:#86868b;padding-bottom:4px;">File</td>
              <td style="font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;padding-bottom:4px;">${fileName}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#86868b;">Error</td>
              <td style="font-size:13px;color:#991b1b;text-align:right;">${errorMessage}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="font-size:14px;color:#424245;line-height:1.6;margin:0 0 8px;">
      <strong>What to do:</strong>
    </p>
    <ul style="font-size:14px;color:#424245;line-height:1.8;padding-left:20px;margin:0 0 16px;">
      <li>Verify the PDF is not corrupted or password-protected.</li>
      <li>Ensure the file contains a readable purchase order (not a scanned image).</li>
      <li>Try uploading the file again.</li>
    </ul>
    ${buttonHtml('Upload Again', uploadUrl)}
    <p style="font-size:13px;color:#86868b;line-height:1.5;margin:0;">
      If the problem persists, contact support with the file name above.
    </p>
  `);

  const text = `Extraction Failed

Hi ${userName},

File: ${fileName}
Error: ${errorMessage}

What to do:
- Verify the PDF is not corrupted or password-protected
- Ensure the file contains a readable purchase order
- Try uploading again at: ${uploadUrl}

Contact support if the problem persists.`;

  return { subject, html, text };
}

// -------------------------------------------------------
// Template: Billing Notification
// -------------------------------------------------------

interface BillingNotificationParams {
  userName: string;
  type: 'payment_succeeded' | 'payment_failed' | 'subscription_canceled' | 'limit_approaching';
  planName?: string;
  amount?: string;
  currentUsage?: number;
  limit?: number;
  billingUrl: string;
}

export function billingNotificationEmail(params: BillingNotificationParams) {
  const { userName, type, planName, amount, currentUsage, limit, billingUrl } = params;

  const config: Record<string, { subject: string; heading: string; message: string; ctaText: string }> = {
    payment_succeeded: {
      subject: `Payment received - ${planName} plan`,
      heading: 'Payment Successful',
      message: `Your payment of ${amount} for the ${planName} plan has been processed successfully. No action required.`,
      ctaText: 'View Billing',
    },
    payment_failed: {
      subject: 'Action required: Payment failed',
      heading: 'Payment Failed',
      message: `We were unable to process your payment for the ${planName} plan. Please update your payment method to avoid service interruption.`,
      ctaText: 'Update Payment Method',
    },
    subscription_canceled: {
      subject: 'Subscription canceled',
      heading: 'Subscription Canceled',
      message: `Your ${planName} subscription has been canceled. Your account has been downgraded to the Free plan (50 POs/month). You can resubscribe at any time.`,
      ctaText: 'Resubscribe',
    },
    limit_approaching: {
      subject: `You've used ${currentUsage} of ${limit} POs this month`,
      heading: 'PO Limit Approaching',
      message: `You've processed ${currentUsage} of your ${limit} monthly POs (${Math.round(((currentUsage || 0) / (limit || 1)) * 100)}% used). Upgrade your plan to process more.`,
      ctaText: 'Upgrade Plan',
    },
  };

  const c = config[type];

  const html = baseLayout(c.subject, `
    <h1 style="font-size:22px;font-weight:700;color:#1d1d1f;margin:0 0 16px;">
      ${c.heading}
    </h1>
    <p style="font-size:14px;color:#424245;line-height:1.6;margin:0 0 16px;">
      Hi ${userName},
    </p>
    <p style="font-size:14px;color:#424245;line-height:1.6;margin:0 0 16px;">
      ${c.message}
    </p>
    ${buttonHtml(c.ctaText, billingUrl)}
  `);

  const text = `${c.heading}

Hi ${userName},

${c.message}

${c.ctaText}: ${billingUrl}`;

  return { subject: c.subject, html, text };
}
