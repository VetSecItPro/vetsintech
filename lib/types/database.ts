/**
 * TypeScript type definitions for the VetsInTech EdTech platform database.
 *
 * Generated manually from Supabase migrations (00001–00011) in the `vit` schema.
 * Format follows the Supabase generated-types convention so these types can be
 * passed as a generic to `createClient<Database>()` if desired.
 *
 * Regenerate when migrations change, or replace with:
 *   npx supabase gen types typescript --project-id <id> --schema vit
 */

// ---------------------------------------------------------------------------
// Enum Types
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "instructor" | "student";
export type CourseStatus = "draft" | "published" | "archived";
export type LessonType = "text" | "video" | "quiz" | "assignment" | "resource";
export type CohortStatus = "active" | "completed" | "archived";
export type EnrollmentStatus = "active" | "completed" | "dropped" | "suspended";
export type QuestionType = "multiple_choice" | "true_false" | "short_answer";
export type NotificationType =
  | "announcement"
  | "discussion_reply"
  | "quiz_graded"
  | "enrollment"
  | "course_completed"
  | "certificate_issued"
  | "mention"
  | "cohort_update";
export type AssignmentStatus = "draft" | "published" | "archived";
export type SubmissionStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "graded"
  | "returned";
export type ExternalPlatform = "coursera" | "pluralsight" | "udemy";
export type SyncStatus = "idle" | "syncing" | "success" | "error";
export type LearningPathStatus = "draft" | "published" | "archived";
export type ResourceType =
  | "pdf"
  | "slide"
  | "document"
  | "spreadsheet"
  | "video"
  | "link"
  | "repo"
  | "other";
export type GradeCategory = "quiz" | "assignment" | "participation" | "extra_credit";
export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type XpEventType =
  | "lesson_complete"
  | "course_complete"
  | "quiz_pass"
  | "quiz_perfect"
  | "assignment_submit"
  | "first_post"
  | "helpful_reply"
  | "streak_milestone"
  | "badge_earned"
  | "path_complete"
  | "login_streak";
export type CalendarEventType = "custom" | "office_hours" | "meeting" | "deadline";

// ---------------------------------------------------------------------------
// Row types  (what SELECT returns)
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  timezone: string;
  is_active: boolean;
  username: string | null;
  headline: string | null;
  portfolio_public: boolean;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  skills: string[];
  military_branch: string | null;
  military_mos: string | null;
  created_at: string;
  updated_at: string;
}

export type PortfolioItemType =
  | "project"
  | "achievement"
  | "work_sample"
  | "certification";

export interface PortfolioItemRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  item_type: PortfolioItemType;
  url: string | null;
  image_url: string | null;
  skills_used: string[];
  visible: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  created_at: string;
}

export interface Course {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[];
  prerequisites: string[];
  status: CourseStatus;
  created_by: string | null;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: LessonType;
  content: Record<string, unknown> | null;
  video_url: string | null;
  sort_order: number;
  estimated_duration_minutes: number | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cohort {
  id: string;
  organization_id: string;
  course_id: string;
  name: string;
  description: string | null;
  status: CohortStatus;
  starts_at: string | null;
  ends_at: string | null;
  max_students: number | null;
  cloned_from: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  cohort_id: string;
  user_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
  status: EnrollmentStatus;
  completed_at: string | null;
  created_at: string;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  cohort_id: string;
  completed_at: string;
  time_spent_seconds: number;
}

export interface CourseProgress {
  id: string;
  user_id: string;
  cohort_id: string;
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  last_lesson_id: string | null;
  last_activity_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  sort_order: number;
  explanation: string | null;
  created_at: string;
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  cohort_id: string;
  score: number | null;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  text_answer: string | null;
  is_correct: boolean | null;
  points_earned: number;
}

export interface Discussion {
  id: string;
  organization_id: string;
  cohort_id: string | null;
  title: string;
  body: Record<string, unknown> | null;
  author_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscussionPost {
  id: string;
  discussion_id: string;
  parent_post_id: string | null;
  author_id: string;
  body: Record<string, unknown>;
  upvote_count: number;
  is_answer: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  organization_id: string;
  cohort_id: string | null;
  title: string;
  body: Record<string, unknown>;
  author_id: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Certificate {
  id: string;
  organization_id: string;
  user_id: string;
  cohort_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  pdf_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExternalPlatformConfig {
  id: string;
  organization_id: string;
  platform: ExternalPlatform;
  is_enabled: boolean;
  credentials: Record<string, unknown>;
  sync_frequency_minutes: number;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalEnrollment {
  id: string;
  organization_id: string;
  user_id: string;
  platform: ExternalPlatform;
  external_course_id: string;
  external_course_title: string;
  enrolled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalProgress {
  id: string;
  external_enrollment_id: string;
  progress_percentage: number;
  status: string;
  completed_at: string | null;
  time_spent_minutes: number | null;
  last_activity_at: string | null;
  raw_data: Record<string, unknown>;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface CourseFile {
  id: string;
  organization_id: string;
  course_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface LearningPathRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  status: LearningPathStatus;
  estimated_hours: number | null;
  difficulty_level: string | null;
  tags: string[];
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LearningPathCourseRow {
  id: string;
  learning_path_id: string;
  course_id: string;
  position: number;
  is_required: boolean;
}

export interface LearningPathEnrollmentRow {
  id: string;
  learning_path_id: string;
  student_id: string;
  enrolled_at: string;
  completed_at: string | null;
  organization_id: string;
}

export interface AssignmentRow {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  max_score: number;
  weight: number;
  due_date: string | null;
  allow_late_submissions: boolean;
  late_penalty_percent: number;
  max_file_size_mb: number;
  allowed_file_types: string[];
  max_attempts: number | null;
  status: AssignmentStatus;
  rubric: Record<string, unknown>[] | null;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  submitted_at: string | null;
  status: SubmissionStatus;
  attempt_number: number;
  score: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  late: boolean;
  late_penalty_applied: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionFileRow {
  id: string;
  submission_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export interface GradeConfigRow {
  id: string;
  course_id: string;
  category: GradeCategory;
  weight: number;
  drop_lowest: number;
  organization_id: string;
  created_at: string;
}

export interface GradeOverrideRow {
  id: string;
  course_id: string;
  student_id: string;
  category: GradeCategory;
  label: string;
  score: number;
  max_score: number;
  notes: string | null;
  graded_by: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  file_path: string | null;
  file_size: number | null;
  file_name: string | null;
  external_url: string | null;
  course_id: string | null;
  tags: string[];
  download_count: number;
  organization_id: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  xp_reward: number;
  criteria: Record<string, unknown>;
  organization_id: string;
  created_at: string;
}

export interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface XpEventRow {
  id: string;
  user_id: string;
  event_type: XpEventType;
  xp_amount: number;
  source_id: string | null;
  source_type: string | null;
  description: string | null;
  organization_id: string;
  created_at: string;
}

export interface StreakRow {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  organization_id: string;
  updated_at: string;
}

export type EmailLogStatus = "sent" | "delivered" | "bounced" | "failed";

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

export interface CalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  course_id: string | null;
  cohort_id: string | null;
  color: string;
  recurring: boolean;
  recurrence_rule: string | null;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Insert types  (required fields for INSERT — omit auto-generated columns)
// ---------------------------------------------------------------------------

export type OrganizationInsert = Omit<Organization, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Organization, "id">>;

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at"> &
  Partial<Pick<Profile, "avatar_url" | "bio" | "phone" | "timezone" | "is_active" | "username" | "headline" | "portfolio_public" | "linkedin_url" | "github_url" | "website_url" | "skills" | "military_branch" | "military_mos">>;

export type CourseInsert = Omit<Course, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Course, "id" | "status" | "tags" | "prerequisites">>;

export type ModuleInsert = Omit<Module, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Module, "id" | "sort_order" | "is_required">>;

export type LessonInsert = Omit<Lesson, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Lesson, "id" | "lesson_type" | "sort_order" | "is_required">>;

export type CohortInsert = Omit<Cohort, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Cohort, "id" | "status">>;

export type EnrollmentInsert = Omit<Enrollment, "id" | "created_at"> &
  Partial<Pick<Enrollment, "id" | "enrolled_at" | "status">>;

export type QuizInsert = Omit<Quiz, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Quiz, "id" | "passing_score" | "shuffle_questions" | "show_correct_answers">>;

export type DiscussionInsert = Omit<Discussion, "id" | "created_at" | "updated_at" | "reply_count"> &
  Partial<Pick<Discussion, "id" | "is_pinned" | "is_locked">>;

export type NotificationInsert = Omit<Notification, "id" | "created_at"> &
  Partial<Pick<Notification, "id" | "is_read" | "metadata">>;

export type CertificateInsert = Omit<Certificate, "id" | "created_at"> &
  Partial<Pick<Certificate, "id" | "metadata">>;

export type LearningPathInsert = Omit<LearningPathRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<LearningPathRow, "id" | "status" | "tags">>;

export type LearningPathCourseInsert = Omit<LearningPathCourseRow, "id"> &
  Partial<Pick<LearningPathCourseRow, "id" | "position" | "is_required">>;

export type LearningPathEnrollmentInsert = Omit<LearningPathEnrollmentRow, "id" | "enrolled_at"> &
  Partial<Pick<LearningPathEnrollmentRow, "id" | "enrolled_at">>;

export type AssignmentInsert = Omit<AssignmentRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<AssignmentRow, "id" | "status" | "max_score" | "weight" | "max_file_size_mb" | "allowed_file_types" | "max_attempts">>;

export type AssignmentSubmissionInsert = Omit<AssignmentSubmissionRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<AssignmentSubmissionRow, "id" | "status" | "attempt_number" | "late" | "late_penalty_applied">>;

export type SubmissionFileInsert = Omit<SubmissionFileRow, "id" | "uploaded_at"> &
  Partial<Pick<SubmissionFileRow, "id">>;

export type GradeConfigInsert = Omit<GradeConfigRow, "id" | "created_at"> &
  Partial<Pick<GradeConfigRow, "id" | "weight" | "drop_lowest">>;

export type GradeOverrideInsert = Omit<GradeOverrideRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<GradeOverrideRow, "id" | "max_score">>;

export type ResourceInsert = Omit<ResourceRow, "id" | "created_at" | "updated_at" | "download_count"> &
  Partial<Pick<ResourceRow, "id" | "tags" | "download_count">>;

export type BadgeInsert = Omit<BadgeRow, "id" | "created_at"> &
  Partial<Pick<BadgeRow, "id" | "rarity" | "xp_reward">>;

export type UserBadgeInsert = Omit<UserBadgeRow, "id" | "earned_at"> &
  Partial<Pick<UserBadgeRow, "id">>;

export type XpEventInsert = Omit<XpEventRow, "id" | "created_at"> &
  Partial<Pick<XpEventRow, "id">>;

export type StreakInsert = Omit<StreakRow, "id" | "updated_at"> &
  Partial<Pick<StreakRow, "id" | "current_streak" | "longest_streak">>;

export type EmailPreferenceInsert = Omit<EmailPreference, "id" | "updated_at"> &
  Partial<Pick<EmailPreference, "id" | "announcement_emails" | "grade_emails" | "assignment_reminder_emails" | "enrollment_emails" | "discussion_reply_emails" | "weekly_digest">>;

export type EmailLogInsert = Omit<EmailLog, "id" | "created_at"> &
  Partial<Pick<EmailLog, "id" | "status">>;

export type CalendarEventInsert = Omit<CalendarEventRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<CalendarEventRow, "id" | "event_type" | "all_day" | "color" | "recurring">>;

export type PortfolioItemInsert = Omit<PortfolioItemRow, "id" | "created_at" | "updated_at"> &
  Partial<Pick<PortfolioItemRow, "id" | "item_type" | "visible" | "position" | "skills_used">>;

// ---------------------------------------------------------------------------
// Update types  (all fields optional for UPDATE)
// ---------------------------------------------------------------------------

export type OrganizationUpdate = Partial<Omit<Organization, "id" | "created_at">>;
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>;
export type CourseUpdate = Partial<Omit<Course, "id" | "created_at">>;
export type ModuleUpdate = Partial<Omit<Module, "id" | "created_at">>;
export type LessonUpdate = Partial<Omit<Lesson, "id" | "created_at">>;
export type CohortUpdate = Partial<Omit<Cohort, "id" | "created_at">>;
export type EnrollmentUpdate = Partial<Pick<Enrollment, "status" | "completed_at">>;
export type DiscussionUpdate = Partial<Omit<Discussion, "id" | "created_at">>;
export type AnnouncementUpdate = Partial<Omit<Announcement, "id" | "created_at">>;
export type NotificationUpdate = Partial<Pick<Notification, "is_read" | "read_at">>;
export type LearningPathUpdate = Partial<Omit<LearningPathRow, "id" | "created_at" | "organization_id" | "created_by">>;
export type LearningPathCourseUpdate = Partial<Pick<LearningPathCourseRow, "position" | "is_required">>;
export type LearningPathEnrollmentUpdate = Partial<Pick<LearningPathEnrollmentRow, "completed_at">>;
export type AssignmentUpdate = Partial<Omit<AssignmentRow, "id" | "created_at" | "organization_id" | "created_by">>;
export type AssignmentSubmissionUpdate = Partial<Omit<AssignmentSubmissionRow, "id" | "created_at" | "organization_id" | "assignment_id" | "student_id">>;
export type ResourceUpdate = Partial<Omit<ResourceRow, "id" | "created_at" | "organization_id" | "uploaded_by">>;
export type BadgeUpdate = Partial<Omit<BadgeRow, "id" | "created_at" | "organization_id">>;
export type StreakUpdate = Partial<Omit<StreakRow, "id" | "user_id" | "organization_id">>;
export type EmailPreferenceUpdate = Partial<Pick<EmailPreference, "announcement_emails" | "grade_emails" | "assignment_reminder_emails" | "enrollment_emails" | "discussion_reply_emails" | "weekly_digest">>;
export type EmailLogUpdate = Partial<Pick<EmailLog, "status" | "error_message" | "resend_id">>;
export type CalendarEventUpdate = Partial<Omit<CalendarEventRow, "id" | "created_at" | "organization_id" | "created_by">>;
export type GradeConfigUpdate = Partial<Pick<GradeConfigRow, "weight" | "drop_lowest">>;
export type GradeOverrideUpdate = Partial<Omit<GradeOverrideRow, "id" | "created_at" | "organization_id" | "course_id" | "graded_by">>;
export type PortfolioItemUpdate = Partial<Omit<PortfolioItemRow, "id" | "user_id" | "created_at">>;

// ---------------------------------------------------------------------------
// Supabase Database interface (for `createClient<Database>()`)
// ---------------------------------------------------------------------------

export interface Database {
  vit: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      user_roles: {
        Row: UserRoleRow;
        Insert: Omit<UserRoleRow, "id" | "created_at"> & Partial<Pick<UserRoleRow, "id">>;
        Update: Partial<Pick<UserRoleRow, "role">>;
      };
      courses: {
        Row: Course;
        Insert: CourseInsert;
        Update: CourseUpdate;
      };
      modules: {
        Row: Module;
        Insert: ModuleInsert;
        Update: ModuleUpdate;
      };
      lessons: {
        Row: Lesson;
        Insert: LessonInsert;
        Update: LessonUpdate;
      };
      cohorts: {
        Row: Cohort;
        Insert: CohortInsert;
        Update: CohortUpdate;
      };
      enrollments: {
        Row: Enrollment;
        Insert: EnrollmentInsert;
        Update: EnrollmentUpdate;
      };
      lesson_completions: {
        Row: LessonCompletion;
        Insert: Omit<LessonCompletion, "id"> & Partial<Pick<LessonCompletion, "id" | "time_spent_seconds">>;
        Update: Partial<Pick<LessonCompletion, "time_spent_seconds">>;
      };
      course_progress: {
        Row: CourseProgress;
        Insert: Omit<CourseProgress, "id" | "updated_at"> & Partial<Pick<CourseProgress, "id">>;
        Update: Partial<Omit<CourseProgress, "id">>;
      };
      quizzes: {
        Row: Quiz;
        Insert: QuizInsert;
        Update: Partial<Omit<Quiz, "id" | "created_at">>;
      };
      quiz_questions: {
        Row: QuizQuestion;
        Insert: Omit<QuizQuestion, "id" | "created_at"> & Partial<Pick<QuizQuestion, "id" | "points" | "sort_order">>;
        Update: Partial<Omit<QuizQuestion, "id" | "created_at">>;
      };
      quiz_options: {
        Row: QuizOption;
        Insert: Omit<QuizOption, "id"> & Partial<Pick<QuizOption, "id" | "is_correct" | "sort_order">>;
        Update: Partial<Omit<QuizOption, "id">>;
      };
      quiz_attempts: {
        Row: QuizAttempt;
        Insert: Omit<QuizAttempt, "id"> & Partial<Pick<QuizAttempt, "id" | "started_at">>;
        Update: Partial<Omit<QuizAttempt, "id">>;
      };
      quiz_answers: {
        Row: QuizAnswer;
        Insert: Omit<QuizAnswer, "id"> & Partial<Pick<QuizAnswer, "id" | "points_earned">>;
        Update: Partial<Omit<QuizAnswer, "id">>;
      };
      discussions: {
        Row: Discussion;
        Insert: DiscussionInsert;
        Update: DiscussionUpdate;
      };
      discussion_posts: {
        Row: DiscussionPost;
        Insert: Omit<DiscussionPost, "id" | "created_at" | "updated_at" | "upvote_count"> &
          Partial<Pick<DiscussionPost, "id" | "is_answer">>;
        Update: Partial<Omit<DiscussionPost, "id" | "created_at">>;
      };
      post_reactions: {
        Row: PostReaction;
        Insert: Omit<PostReaction, "id" | "created_at"> & Partial<Pick<PostReaction, "id" | "reaction_type">>;
        Update: never;
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, "id" | "created_at" | "updated_at"> &
          Partial<Pick<Announcement, "id" | "is_published">>;
        Update: AnnouncementUpdate;
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      certificates: {
        Row: Certificate;
        Insert: CertificateInsert;
        Update: Partial<Pick<Certificate, "pdf_url" | "metadata">>;
      };
      external_platform_configs: {
        Row: ExternalPlatformConfig;
        Insert: Omit<ExternalPlatformConfig, "id" | "created_at" | "updated_at"> &
          Partial<Pick<ExternalPlatformConfig, "id" | "is_enabled" | "sync_frequency_minutes" | "sync_status">>;
        Update: Partial<Omit<ExternalPlatformConfig, "id" | "created_at">>;
      };
      external_enrollments: {
        Row: ExternalEnrollment;
        Insert: Omit<ExternalEnrollment, "id" | "created_at" | "updated_at"> &
          Partial<Pick<ExternalEnrollment, "id">>;
        Update: Partial<Omit<ExternalEnrollment, "id" | "created_at">>;
      };
      external_progress: {
        Row: ExternalProgress;
        Insert: Omit<ExternalProgress, "id" | "created_at" | "updated_at" | "synced_at"> &
          Partial<Pick<ExternalProgress, "id">>;
        Update: Partial<Omit<ExternalProgress, "id" | "created_at">>;
      };
      course_files: {
        Row: CourseFile;
        Insert: Omit<CourseFile, "id" | "created_at"> & Partial<Pick<CourseFile, "id">>;
        Update: Partial<Pick<CourseFile, "file_name" | "thumbnail_url">>;
      };
      learning_paths: {
        Row: LearningPathRow;
        Insert: LearningPathInsert;
        Update: LearningPathUpdate;
      };
      learning_path_courses: {
        Row: LearningPathCourseRow;
        Insert: LearningPathCourseInsert;
        Update: LearningPathCourseUpdate;
      };
      learning_path_enrollments: {
        Row: LearningPathEnrollmentRow;
        Insert: LearningPathEnrollmentInsert;
        Update: LearningPathEnrollmentUpdate;
      };
      assignments: {
        Row: AssignmentRow;
        Insert: AssignmentInsert;
        Update: AssignmentUpdate;
      };
      assignment_submissions: {
        Row: AssignmentSubmissionRow;
        Insert: AssignmentSubmissionInsert;
        Update: AssignmentSubmissionUpdate;
      };
      submission_files: {
        Row: SubmissionFileRow;
        Insert: SubmissionFileInsert;
        Update: Partial<Pick<SubmissionFileRow, "file_name">>;
      };
      grade_configs: {
        Row: GradeConfigRow;
        Insert: GradeConfigInsert;
        Update: GradeConfigUpdate;
      };
      grade_overrides: {
        Row: GradeOverrideRow;
        Insert: GradeOverrideInsert;
        Update: GradeOverrideUpdate;
      };
      resources: {
        Row: ResourceRow;
        Insert: ResourceInsert;
        Update: ResourceUpdate;
      };
      badges: {
        Row: BadgeRow;
        Insert: BadgeInsert;
        Update: BadgeUpdate;
      };
      user_badges: {
        Row: UserBadgeRow;
        Insert: UserBadgeInsert;
        Update: never;
      };
      xp_events: {
        Row: XpEventRow;
        Insert: XpEventInsert;
        Update: never;
      };
      streaks: {
        Row: StreakRow;
        Insert: StreakInsert;
        Update: StreakUpdate;
      };
      email_preferences: {
        Row: EmailPreference;
        Insert: EmailPreferenceInsert;
        Update: EmailPreferenceUpdate;
      };
      email_log: {
        Row: EmailLog;
        Insert: EmailLogInsert;
        Update: EmailLogUpdate;
      };
      calendar_events: {
        Row: CalendarEventRow;
        Insert: CalendarEventInsert;
        Update: CalendarEventUpdate;
      };
      portfolio_items: {
        Row: PortfolioItemRow;
        Insert: PortfolioItemInsert;
        Update: PortfolioItemUpdate;
      };
    };
    Enums: {
      user_role: UserRole;
      course_status: CourseStatus;
      lesson_type: LessonType;
      cohort_status: CohortStatus;
      enrollment_status: EnrollmentStatus;
      question_type: QuestionType;
      notification_type: NotificationType;
      external_platform: ExternalPlatform;
      sync_status: SyncStatus;
      assignment_status: AssignmentStatus;
      submission_status: SubmissionStatus;
      grade_category: GradeCategory;
      learning_path_status: LearningPathStatus;
      resource_type: ResourceType;
      badge_rarity: BadgeRarity;
      xp_event_type: XpEventType;
      email_log_status: EmailLogStatus;
      calendar_event_type: CalendarEventType;
      portfolio_item_type: PortfolioItemType;
    };
  };
}
