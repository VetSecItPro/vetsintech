// ============================================================================
// Email Service — public barrel export
// ============================================================================

export { resend } from "./client";
export { sendEmail } from "./send";
export type { SendEmailOptions, SendEmailResult } from "./send";

// Templates
export {
  announcementSubject,
  announcementHtml,
} from "./templates/announcement";
export type { AnnouncementEmailData } from "./templates/announcement";

export { gradePostedSubject, gradePostedHtml } from "./templates/grade-posted";
export type { GradePostedEmailData } from "./templates/grade-posted";

export {
  assignmentReminderSubject,
  assignmentReminderHtml,
} from "./templates/assignment-reminder";
export type { AssignmentReminderEmailData } from "./templates/assignment-reminder";

export { enrollmentSubject, enrollmentHtml } from "./templates/enrollment";
export type { EnrollmentEmailData } from "./templates/enrollment";

export {
  weeklyDigestSubject,
  weeklyDigestHtml,
} from "./templates/weekly-digest";
export type {
  WeeklyDigestEmailData,
  WeeklyDigestCourse,
  WeeklyDigestDeadline,
} from "./templates/weekly-digest";

export { baseTemplate } from "./templates/base";
export type { BaseTemplateOptions } from "./templates/base";
