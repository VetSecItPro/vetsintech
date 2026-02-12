// ============================================================================
// Generic Email Send Function
// Wraps Resend + logs to email_log table
// ============================================================================

import { resend } from "./client";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "VetsInTech <noreply@vetsintech.org>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Resend-compatible from address. Defaults to EMAIL_FROM env var. */
  from?: string;
  /** Template name for audit log (e.g. 'announcement', 'grade-posted'). */
  template: string;
  /** User ID of the recipient (for linking in email_log). */
  toUserId?: string;
  /** Organization ID for scoping the log entry. */
  organizationId: string;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

/**
 * Send a transactional email via Resend and log the result.
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const { to, subject, html, from, template, toUserId, organizationId } =
    options;

  const supabase = await createClient();

  let resendId: string | undefined;
  let status: "sent" | "failed" = "sent";
  let errorMessage: string | undefined;

  try {
    const { data, error } = await resend.emails.send({
      from: from ?? DEFAULT_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      status = "failed";
      errorMessage = error.message;
    } else {
      resendId = data?.id;
    }
  } catch (err) {
    status = "failed";
    errorMessage =
      err instanceof Error ? err.message : "Unknown error sending email";
  }

  // Log to email_log regardless of outcome
  try {
    await supabase.from("email_log").insert({
      to_email: to,
      to_user_id: toUserId ?? null,
      subject,
      template,
      resend_id: resendId ?? null,
      status,
      error_message: errorMessage ?? null,
      organization_id: organizationId,
    });
  } catch (logErr) {
    // Don't fail the whole operation if logging fails
    console.error("Failed to log email:", logErr);
  }

  if (status === "failed") {
    return { success: false, error: errorMessage };
  }

  return { success: true, resendId };
}
