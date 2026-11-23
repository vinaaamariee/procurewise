import net from "node:net";
import tls from "node:tls";

export interface PrSubmissionEmailPayload {
  recipientEmail: string;
  recipientName: string;
  prTrackingNumber: string;
  category: string;
  itemCount: number;
  totalEstimatedBudget: number;
  ppmpFileName: string;
  purpose: string;
  dashboardUrl: string;
}

export interface EmailDispatchResult {
  status: "SENT" | "FAILED";
  recipientEmail: string;
  procurementOfficeEmail: string;
  sentAt: string;
  transport: "resend_api" | "smtp" | "development_log" | "brevo_api";
  error?: string;
}

export const ALLOWED_PPMP_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export const ALLOWED_PPMP_EXTENSIONS = new Set([".pdf", ".xlsx", ".xls"]);

export const MAX_PPMP_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const PPMP_FILE_REJECTION_MESSAGE =
  "File not accepted. Please upload only official PDF or Excel (.xlsx, .xls) files under 10MB.";

/**
 * Strictly validates that a PPMP upload is an official PDF or Excel (.pdf, .xlsx, .xls)
 * file and does not exceed 10MB (BSC-PRO-QP-95-1 Step 5.1 / Annex B).
 */
export function validatePpmpFileUpload(input: {
  originalFileName: string;
  mimeType: string;
  byteLength: number;
}): { valid: boolean; error?: string } {
  const fileName = (input.originalFileName || "").trim().toLowerCase();
  const extMatch = fileName.match(/\.[a-z0-9]+$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";
  const normalizedMime = (input.mimeType || "").trim().toLowerCase();

  const hasValidExtension = ALLOWED_PPMP_EXTENSIONS.has(ext);
  const hasValidMime =
    ALLOWED_PPMP_MIME_TYPES.has(normalizedMime) ||
    (hasValidExtension && normalizedMime === "application/octet-stream");

  if (!hasValidExtension || !hasValidMime) {
    return { valid: false, error: PPMP_FILE_REJECTION_MESSAGE };
  }

  if (!input.byteLength || input.byteLength <= 0 || input.byteLength > MAX_PPMP_FILE_SIZE_BYTES) {
    return { valid: false, error: PPMP_FILE_REJECTION_MESSAGE };
  }

  return { valid: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPhpCurrency(amount: number): string {
  return `₱${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * High-contrast HTML Email Template for End-User Confirmation
 * Matches Batanes State College Maroon (#881337) and WCAG AAA contrast standards.
 */
export function buildEndUserConfirmationEmailHtml(payload: PrSubmissionEmailPayload): string {
  const formattedTotal = formatPhpCurrency(payload.totalEstimatedBudget);
  const safeName = escapeHtml(payload.recipientName || "BSC End-User");
  const safePrNo = escapeHtml(payload.prTrackingNumber);
  const safeCategory = escapeHtml(payload.category || "Office Supplies");
  const safePpmpFile = escapeHtml(payload.ppmpFileName || "Approved Department PPMP");
  const safePurpose = escapeHtml(payload.purpose);
  const safeUrl = escapeHtml(payload.dashboardUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[ProcureWise] Purchase Request Submitted: #${safePrNo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; font-size: 16px; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 16px; overflow: hidden;">
          <!-- BSC Maroon Institutional Header -->
          <tr>
            <td style="background-color: #881337; padding: 28px 32px; color: #ffffff;">
              <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #fecdd3; margin-bottom: 6px;">
                Batanes State College · ProcureWise System
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                Purchase Request Submitted
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #ffe4e6;">
                Tracking Reference: <strong style="color: #ffffff; font-family: monospace; font-size: 17px;">#${safePrNo}</strong>
              </p>
            </td>
          </tr>

          <!-- Greeting & Plain-Language Explanation -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a;">
                Good day, <strong>${safeName}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #1e293b;">
                Your Purchase Request has been officially recorded in <strong>ProcureWise</strong> under Quality Procedure <strong>BSC – PRO -QP- 95 – 1</strong>. Keep this email for your department records.
              </p>

              <!-- High-Contrast Summary Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 2px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                <tr style="background-color: #f8fafc;">
                  <td colspan="2" style="padding: 12px 16px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; border-bottom: 2px solid #cbd5e1;">
                    Request Summary (Appendix 60 / Annex B)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; width: 42%;">
                    PR Tracking Number
                  </td>
                  <td style="padding: 12px 16px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: monospace;">
                    #${safePrNo}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Item Category (Rule 5.1.1)
                  </td>
                  <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${safeCategory}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Number of Line Items
                  </td>
                  <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${payload.itemCount} ${payload.itemCount === 1 ? "item" : "items"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Attached Budget Plan (PPMP)
                  </td>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${safePpmpFile}
                  </td>
                </tr>
                <tr style="background-color: #fff1f2;">
                  <td style="padding: 14px 16px; font-size: 16px; font-weight: 800; color: #881337; border-bottom: 1px solid #fecdd3;">
                    Total Estimated Budget
                  </td>
                  <td style="padding: 14px 16px; font-size: 18px; font-weight: 800; color: #881337; border-bottom: 1px solid #fecdd3;">
                    ${formattedTotal}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; vertical-align: top;">
                    Stated Purpose
                  </td>
                  <td style="padding: 12px 16px; font-size: 15px; color: #1e293b;">
                    ${safePurpose}
                  </td>
                </tr>
              </table>

              <!-- Next Step Guidance Box -->
              <div style="background-color: #f8fafc; border: 2px solid #cbd5e1; border-left: 6px solid #881337; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                  What Happens Next? (Step 5.1 Verification)
                </div>
                <p style="margin: 0; font-size: 15px; color: #334155;">
                  <strong>Procurement Officer II</strong> has been notified to check your attached PPMP budget plan and verify single-category compliance under Clause 5.1.1. You will receive an update as soon as your request advances.
                </p>
              </div>

              <!-- Primary Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${safeUrl}" style="display: inline-block; min-height: 48px; line-height: 48px; background-color: #881337; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 0 28px; border-radius: 12px;">
                      View My Request Online
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 2px solid #e2e8f0; padding: 20px 32px; font-size: 14px; color: #475569;">
              <strong>Batanes State College · Procurement Management Office</strong><br />
              Basco, Batanes · Compliant with RA 12009 &amp; BSC – PRO -QP- 95 – 1
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEndUserConfirmationEmailText(payload: PrSubmissionEmailPayload): string {
  const formattedTotal = formatPhpCurrency(payload.totalEstimatedBudget);
  return [
    `[ProcureWise] Purchase Request Submitted: #${payload.prTrackingNumber}`,
    `Batanes State College · Quality Procedure BSC – PRO -QP- 95 – 1`,
    ``,
    `Good day, ${payload.recipientName || "BSC End-User"},`,
    ``,
    `Your Purchase Request has been officially submitted in ProcureWise.`,
    ``,
    `REQUEST SUMMARY:`,
    `- PR Tracking Number: #${payload.prTrackingNumber}`,
    `- Item Category (Rule 5.1.1): ${payload.category || "Office Supplies"}`,
    `- Number of Line Items: ${payload.itemCount}`,
    `- Attached PPMP File: ${payload.ppmpFileName || "Approved Department PPMP"}`,
    `- Total Estimated Budget: ${formattedTotal}`,
    `- Purpose: ${payload.purpose}`,
    ``,
    `WHAT HAPPENS NEXT (Step 5.1 Verification):`,
    `Procurement Officer II has been notified to verify your attached PPMP budget plan and item category segregation under Clause 5.1.1.`,
    ``,
    `View My Request Online: ${payload.dashboardUrl}`,
  ].join("\n");
}

/**
 * High-contrast HTML Email Template for Procurement Office Action Alert
 */
export function buildProcurementOfficerAlertEmailHtml(payload: PrSubmissionEmailPayload): string {
  const formattedTotal = formatPhpCurrency(payload.totalEstimatedBudget);
  const safeName = escapeHtml(payload.recipientName || "BSC End-User");
  const safeEmail = escapeHtml(payload.recipientEmail || "enduser@bsc.edu.ph");
  const safePrNo = escapeHtml(payload.prTrackingNumber);
  const safeCategory = escapeHtml(payload.category || "Office Supplies");
  const safePpmpFile = escapeHtml(payload.ppmpFileName || "Approved Department PPMP");
  const safePurpose = escapeHtml(payload.purpose);
  const verificationUrl = escapeHtml(
    payload.dashboardUrl.replace(/\/purchase-requests.*$/, "/pr-verification")
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[ProcureWise Action Required] New Request for Verification: #${safePrNo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; font-size: 16px; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 16px; overflow: hidden;">
          <!-- BSC Maroon Institutional Header -->
          <tr>
            <td style="background-color: #881337; padding: 28px 32px; color: #ffffff;">
              <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #fecdd3; margin-bottom: 6px;">
                Action Required · Step 5.1 Verification Queue
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                New Purchase Request for Verification
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; color: #ffe4e6;">
                PR Number: <strong style="color: #ffffff; font-family: monospace; font-size: 17px;">#${safePrNo}</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #1e293b;">
                A new Purchase Request package has been submitted and requires <strong>Step 5.1 Completeness &amp; PPMP Verification</strong> by Procurement Officer II.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 2px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                <tr style="background-color: #f8fafc;">
                  <td colspan="2" style="padding: 12px 16px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; border-bottom: 2px solid #cbd5e1;">
                    Submission Details
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; width: 42%;">
                    Submitted By (End-User)
                  </td>
                  <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${safeName} (${safeEmail})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Declared Category
                  </td>
                  <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${safeCategory}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Attached PPMP File
                  </td>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${safePpmpFile}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
                    Line Items Count
                  </td>
                  <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                    ${payload.itemCount} ${payload.itemCount === 1 ? "item" : "items"}
                  </td>
                </tr>
                <tr style="background-color: #fff1f2;">
                  <td style="padding: 14px 16px; font-size: 16px; font-weight: 800; color: #881337; border-bottom: 1px solid #fecdd3;">
                    Total Estimated Budget
                  </td>
                  <td style="padding: 14px 16px; font-size: 18px; font-weight: 800; color: #881337; border-bottom: 1px solid #fecdd3;">
                    ${formattedTotal}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 15px; font-weight: 600; color: #475569; vertical-align: top;">
                    Purpose
                  </td>
                  <td style="padding: 12px 16px; font-size: 15px; color: #1e293b;">
                    ${safePurpose}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${verificationUrl}" style="display: inline-block; min-height: 48px; line-height: 48px; background-color: #881337; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 0 28px; border-radius: 12px;">
                      Open Verification Workbench (Step 5.1)
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 2px solid #e2e8f0; padding: 20px 32px; font-size: 14px; color: #475569;">
              <strong>Batanes State College · Procurement Management Office</strong><br />
              Automated Workflow Alert · BSC – PRO -QP- 95 – 1 Step 5.1
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildProcurementOfficerAlertEmailText(payload: PrSubmissionEmailPayload): string {
  const formattedTotal = formatPhpCurrency(payload.totalEstimatedBudget);
  const verificationUrl = payload.dashboardUrl.replace(/\/purchase-requests.*$/, "/pr-verification");
  return [
    `[ProcureWise Action Required] New Request for Verification: #${payload.prTrackingNumber}`,
    `Batanes State College · Step 5.1 Verification Queue`,
    ``,
    `A new Purchase Request has been submitted and awaits Step 5.1 verification:`,
    `- PR Tracking Number: #${payload.prTrackingNumber}`,
    `- Submitted By: ${payload.recipientName} (${payload.recipientEmail})`,
    `- Declared Category (Rule 5.1.1): ${payload.category || "Office Supplies"}`,
    `- Attached PPMP File: ${payload.ppmpFileName || "Approved Department PPMP"}`,
    `- Line Items: ${payload.itemCount}`,
    `- Total Estimated Budget: ${formattedTotal}`,
    `- Purpose: ${payload.purpose}`,
    ``,
    `Open Verification Workbench (Step 5.1): ${verificationUrl}`,
  ].join("\n");
}

export type SystemEmailConfig = {
  resendApiKey?: string;
  brevoApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  isConfigured: boolean;
  provider: string;
};

type EmailSettingsResolver = () => Promise<SystemEmailConfig>;
let _settingsResolver: EmailSettingsResolver | null = null;
export function registerEmailSettingsResolver(resolver: EmailSettingsResolver) {
  _settingsResolver = resolver;
}

export async function getActiveEmailConfig(): Promise<SystemEmailConfig> {
  if (_settingsResolver) {
    try {
      return await _settingsResolver();
    } catch {
      // fallback
    }
  }
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
  const brevoApiKey = process.env.BREVO_API_KEY?.trim() || "";
  const smtpHost = process.env.SMTP_HOST?.trim() || "";
  const smtpPort = Number(process.env.SMTP_PORT || "465");
  const smtpUser = process.env.SMTP_USER?.trim() || "";
  const smtpPass = process.env.SMTP_PASS?.trim() || "";
  const smtpFrom = process.env.SMTP_FROM?.trim() || (smtpUser ? `Batanes State College ProcureWise <${smtpUser}>` : "Batanes State College ProcureWise <no-reply@bsc.edu.ph>");
  const isConfigured = Boolean(resendApiKey || brevoApiKey || (smtpHost && smtpUser && smtpPass));
  return {
    resendApiKey,
    brevoApiKey,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpFrom,
    isConfigured,
    provider: resendApiKey ? "Resend API" : brevoApiKey ? "Brevo API" : smtpHost ? `SMTP (${smtpHost}:${smtpPort})` : "none",
  };
}

async function dispatchSingleEmail(message: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<"resend_api" | "brevo_api" | "smtp" | "development_log"> {
  const config = await getActiveEmailConfig();

  // 1. Resend API (HTTP-based, reliable on Vercel)
  if (config.resendApiKey) {
    const fromAddr = config.smtpFrom || message.from;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`Resend API HTTP ${response.status}: ${errBody}`);
    }
    return "resend_api";
  }

  // 2. Brevo (Sendinblue) API (HTTP-based, 300 free emails/day)
  if (config.brevoApiKey) {
    const fromAddr = config.smtpFrom || message.from;
    const fromEmail = fromAddr.match(/<([^>]+)>/)?.[1] || fromAddr;
    const fromName = fromAddr.match(/^"?([^"<]+)"?\s*</)?.[1] || "ProcureWise";
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`Brevo API HTTP ${response.status}: ${errBody}`);
    }
    return "brevo_api";
  }

  // 3. SMTP (supports port 465 direct SSL and port 587)
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    await sendRawSmtpEmail({
      host: config.smtpHost,
      port: config.smtpPort || 465,
      secure: config.smtpPort === 465,
      user: config.smtpUser,
      pass: config.smtpPass,
      from: config.smtpFrom || message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return "smtp";
  }

  // Fallback for local / unconfigured environments
  console.info(
    `[ProcureWise Email Dispatch (Unconfigured)] To: ${message.to} | Subject: ${message.subject}`
  );
  return "development_log";
}

async function sendRawSmtpEmail(config: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const isDirectSsl = config.secure || config.port === 465;
    const socket = isDirectSsl
      ? tls.connect({ host: config.host, port: config.port, rejectUnauthorized: false })
      : net.createConnection({ host: config.host, port: config.port });

    socket.setTimeout(10000);

    const boundary = `----=_ProcureWise_${Date.now().toString(16)}`;
    const mimeBody = [
      `From: ${config.from}`,
      `To: <${config.to}>`,
      `Subject: ${config.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      config.text,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      config.html,
      ``,
      `--${boundary}--`,
      `.`,
      `QUIT`,
    ].join("\r\n");

    let stage: "init" | "ehlo" | "auth" | "user" | "pass" | "from" | "rcpt" | "data" | "body" | "done" = "init";
    let buffer = "";

    function onLines(chunk: string) {
      buffer += chunk;
      const lines = buffer.split("\r\n");
      if (lines.length < 2) return;
      const completeLines = lines.slice(0, -1);
      const lastLine = completeLines[completeLines.length - 1];
      const match = lastLine.match(/^(\d{3})(?:([ -])(.*))?$/);
      if (!match) return;
      const code = parseInt(match[1], 10);
      const isContinuation = match[2] === "-";
      if (isContinuation) {
        return; // wait for final line without hyphen
      }

      buffer = lines[lines.length - 1];

      if (code >= 400) {
        socket.destroy();
        reject(new Error(`SMTP server error [${code}]: ${match[3] || lastLine}`));
        return;
      }

      try {
        if (stage === "init") {
          stage = "ehlo";
          socket.write(`EHLO procurewise.bsc.edu.ph\r\n`);
        } else if (stage === "ehlo") {
          if (config.user && config.pass) {
            stage = "auth";
            socket.write(`AUTH LOGIN\r\n`);
          } else {
            stage = "from";
            const fromAddr = config.from.match(/<([^>]+)>/)?.[1] || config.from;
            socket.write(`MAIL FROM:<${fromAddr}>\r\n`);
          }
        } else if (stage === "auth") {
          stage = "user";
          const b64User = Buffer.from(config.user || "").toString("base64");
          socket.write(`${b64User}\r\n`);
        } else if (stage === "user") {
          stage = "pass";
          const b64Pass = Buffer.from(config.pass || "").toString("base64");
          socket.write(`${b64Pass}\r\n`);
        } else if (stage === "pass") {
          stage = "from";
          const fromAddr = config.from.match(/<([^>]+)>/)?.[1] || config.from;
          socket.write(`MAIL FROM:<${fromAddr}>\r\n`);
        } else if (stage === "from") {
          stage = "rcpt";
          socket.write(`RCPT TO:<${config.to}>\r\n`);
        } else if (stage === "rcpt") {
          stage = "data";
          socket.write(`DATA\r\n`);
        } else if (stage === "data") {
          stage = "body";
          socket.write(`${mimeBody}\r\n`);
        } else if (stage === "body") {
          stage = "done";
          socket.end();
          resolve();
        }
      } catch (err) {
        socket.destroy();
        reject(err);
      }
    }

    socket.on("data", (data) => onLines(data.toString("utf8")));
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timed out after 10 seconds."));
    });
    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });
  });
}

export async function sendTestWorkflowEmail(recipientEmail: string): Promise<{
  success: boolean;
  transport: string;
  message: string;
  error?: string;
}> {
  const normalizedEmail = recipientEmail.trim();
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error("Invalid email address provided.");
  }

  const config = await getActiveEmailConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      transport: "none",
      message: "No outbound email provider is configured yet. Enter a Resend API Key or Gmail App Password in Settings to enable delivery to your Gmail.",
    };
  }

  const subject = `[ProcureWise Test Alert] Personal notification system check`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1e293b; background: #f8fafc;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 2px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
    <div style="background: #881337; color: white; padding: 20px 24px;">
      <h2 style="margin: 0; font-size: 20px;">ProcureWise Email Test</h2>
      <p style="margin: 4px 0 0 0; color: #fecdd3; font-size: 13px;">Batanes State College Procurement Management</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 16px;">Hello,</p>
      <p style="font-size: 15px; line-height: 1.5;">This confirms that your personal account (<strong>${escapeHtml(normalizedEmail)}</strong>) is connected to ProcureWise. You will receive system notifications whenever your Purchase Requests are returned, advanced, or approved.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 6px; padding: 12px 16px; margin: 20px 0; font-size: 14px; color: #166534;">
        Active Transport: <strong>${config.provider}</strong> · Sent at ${new Date().toLocaleString("en-PH")}
      </div>
      <p style="font-size: 13px; color: #64748b;">If you see this email, personal Gmail notifications are 100% active and working.</p>
    </div>
  </div>
</body>
</html>`;
  const text = `[ProcureWise Test Alert] Personal notification system check\n\nHello,\nThis confirms that your personal account (${normalizedEmail}) is connected to ProcureWise. Provider: ${config.provider}`;

  try {
    const transport = await dispatchSingleEmail({
      from: config.smtpFrom || "Batanes State College ProcureWise <no-reply@bsc.edu.ph>",
      to: normalizedEmail,
      subject,
      html,
      text,
    });

    return {
      success: true,
      transport,
      message: `Test email successfully dispatched via ${transport} to ${normalizedEmail}! Please check your Inbox (and Spam/Junk folder).`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      transport: "failed",
      message: `Email dispatch failed: ${errorMsg}`,
      error: errorMsg,
    };
  }
}

/**
 * Dual-Recipient Dispatch Logic (BSC-PRO-QP-95-1 Step 5.1):
 * 1. Confirmation email to the End-User (`payload.recipientEmail`)
 * 2. Action-Required Alert email to the Procurement Office (`procurement@bsc.edu.ph`)
 *
 * Non-blocking: Wrapped in try/catch so database transactions never fail if SMTP times out.
 */
export async function sendPrSubmissionNotifications(
  payload: PrSubmissionEmailPayload
): Promise<EmailDispatchResult> {
  const fromAddress =
    process.env.SMTP_FROM || "Batanes State College ProcureWise <no-reply@bsc.edu.ph>";
  const procurementOfficeEmail =
    process.env.PROCUREMENT_OFFICE_EMAIL || "procurement@bsc.edu.ph";
  const recipientEmail = payload.recipientEmail?.trim() || "enduser@bsc.edu.ph";
  const sentAt = new Date().toISOString();

  try {
    const endUserSubject = `[ProcureWise] Purchase Request Submitted: #${payload.prTrackingNumber}`;
    const endUserHtml = buildEndUserConfirmationEmailHtml(payload);
    const endUserText = buildEndUserConfirmationEmailText(payload);

    const officerSubject = `[ProcureWise Action Required] New Request for Verification: #${payload.prTrackingNumber}`;
    const officerHtml = buildProcurementOfficerAlertEmailHtml(payload);
    const officerText = buildProcurementOfficerAlertEmailText(payload);

    const [transport] = await Promise.all([
      dispatchSingleEmail({
        from: fromAddress,
        to: recipientEmail,
        subject: endUserSubject,
        html: endUserHtml,
        text: endUserText,
      }),
      dispatchSingleEmail({
        from: fromAddress,
        to: procurementOfficeEmail,
        subject: officerSubject,
        html: officerHtml,
        text: officerText,
      }),
    ]);

    return {
      status: "SENT",
      recipientEmail,
      procurementOfficeEmail,
      sentAt,
      transport,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[ProcureWise Email Error] Failed to send PR submission notifications:", errMsg);
    return {
      status: "FAILED",
      recipientEmail,
      procurementOfficeEmail,
      sentAt,
      transport: "smtp",
      error: errMsg,
    };
  }
}

export interface WorkflowUpdateEmailPayload {
  recipientEmail: string;
  recipientName?: string | null;
  title: string;
  body: string;
  kind?: string;
  entityType?: string;
  entityId?: number;
}

export function buildWorkflowUpdateEmailHtml(payload: WorkflowUpdateEmailPayload): string {
  const safeName = escapeHtml(payload.recipientName || "ProcureWise User");
  const safeTitle = escapeHtml(payload.title);
  const safeBody = escapeHtml(payload.body).replace(/\n/g, "<br />");
  const safeKind = escapeHtml((payload.kind || "System Notification").replace(/_/g, " ").toUpperCase());
  const baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://procurewise-ruddy.vercel.app";
  const actionUrl = `${baseUrl}/notifications`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[ProcureWise] ${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; font-size: 16px; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #881337; padding: 24px 32px; color: #ffffff;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #fecdd3; margin-bottom: 6px;">
                ${safeKind}
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #ffffff;">
                ${safeTitle}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b;">
                Hello <strong>${safeName}</strong>,
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #881337; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                ${safeBody}
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${actionUrl}" style="display: inline-block; min-height: 44px; line-height: 44px; background-color: #881337; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 0 28px; border-radius: 10px;">
                      Open ProcureWise Workspace
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 13px; color: #64748b;">
              <strong>Batanes State College · ProcureWise</strong><br />
              This is an automated workflow notification sent to your personal account.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWorkflowNotificationEmail(payload: WorkflowUpdateEmailPayload): Promise<void> {
  const recipientEmail = payload.recipientEmail?.trim();
  if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) return;

  const fromAddress =
    process.env.SMTP_FROM || "Batanes State College ProcureWise <no-reply@bsc.edu.ph>";
  const subject = `[ProcureWise] ${payload.title}`;
  const html = buildWorkflowUpdateEmailHtml(payload);
  const text = [
    `[ProcureWise] ${payload.title}`,
    `Good day, ${payload.recipientName || "ProcureWise User"},`,
    ``,
    payload.body,
    ``,
    `View in your workspace: ${process.env.VITE_APP_URL || process.env.APP_URL || "https://procurewise-ruddy.vercel.app"}/notifications`,
  ].join("\n");

  try {
    await dispatchSingleEmail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.warn(`[ProcureWise Email Warning] Could not deliver notification email to ${recipientEmail}:`, err);
  }
}

