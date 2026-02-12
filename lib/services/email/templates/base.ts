// ============================================================================
// Base Email Template
// VetsInTech branding: navy (#1B2A4A) / gold (#C5A55A) responsive wrapper
// ============================================================================

const EMAIL_FROM_NAME = "VetsInTech Learning";

export interface BaseTemplateOptions {
  /** Main heading text */
  heading: string;
  /** Pre-header text (shows in email client previews) */
  preheader?: string;
  /** Inner HTML body content */
  bodyHtml: string;
  /** Optional CTA button */
  ctaUrl?: string;
  ctaLabel?: string;
  /** Unsubscribe URL */
  unsubscribeUrl?: string;
}

export function baseTemplate(options: BaseTemplateOptions): string {
  const {
    heading,
    preheader = "",
    bodyHtml,
    ctaUrl,
    ctaLabel,
    unsubscribeUrl,
  } = options;

  const ctaBlock = ctaUrl && ctaLabel
    ? `
      <tr>
        <td align="center" style="padding: 24px 0 8px 0;">
          <a href="${ctaUrl}"
             style="display: inline-block; background-color: #C5A55A; color: #1B2A4A; font-weight: 700;
                    text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${ctaLabel}
          </a>
        </td>
      </tr>`
    : "";

  const unsubscribeBlock = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Manage email preferences</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1e293b; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #1B2A4A; padding: 24px 32px; text-align: center;">
              <span style="font-size: 22px; font-weight: 700; color: #C5A55A; letter-spacing: 0.5px;">
                ${EMAIL_FROM_NAME}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #f1f5f9;">
                ${heading}
              </h1>
              <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                ${bodyHtml}
              </div>

              ${ctaBlock}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                This email was sent by VetsInTech Learning Platform.<br />
                ${unsubscribeBlock}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
