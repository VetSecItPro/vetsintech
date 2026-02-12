// ============================================================================
// Email Domain Types
// Maps to: email_preferences, email_log tables
// ============================================================================

// ---------- Core Entities ----------

export interface EmailPreference {
  id: string;
  user_id: string;
  announcement_emails: boolean;
  grade_emails: boolean;
  assignment_reminder_emails: boolean;
  enrollment_emails: boolean;
  discussion_reply_emails: boolean;
  weekly_digest: boolean;
  organization_id: string;
  updated_at: string;
}

export type EmailLogStatus = "sent" | "delivered" | "bounced" | "failed";

export interface EmailLog {
  id: string;
  to_email: string;
  to_user_id: string | null;
  subject: string;
  template: string;
  resend_id: string | null;
  status: EmailLogStatus;
  error_message: string | null;
  organization_id: string;
  created_at: string;
}

// ---------- Input Types ----------

export interface UpdateEmailPreferencesInput {
  announcement_emails?: boolean;
  grade_emails?: boolean;
  assignment_reminder_emails?: boolean;
  enrollment_emails?: boolean;
  discussion_reply_emails?: boolean;
  weekly_digest?: boolean;
}
