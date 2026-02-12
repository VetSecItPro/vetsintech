// ============================================================================
// Email Domain Validation Schemas
// ============================================================================

import { z } from "zod/v4";

export const updateEmailPreferencesSchema = z.object({
  announcement_emails: z.boolean().optional(),
  grade_emails: z.boolean().optional(),
  assignment_reminder_emails: z.boolean().optional(),
  enrollment_emails: z.boolean().optional(),
  discussion_reply_emails: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
});

export type UpdateEmailPreferencesFormData = z.infer<
  typeof updateEmailPreferencesSchema
>;
