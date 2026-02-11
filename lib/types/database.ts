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
export type ExternalPlatform = "coursera" | "pluralsight" | "udemy";
export type SyncStatus = "idle" | "syncing" | "success" | "error";

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

// ---------------------------------------------------------------------------
// Insert types  (required fields for INSERT — omit auto-generated columns)
// ---------------------------------------------------------------------------

export type OrganizationInsert = Omit<Organization, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Organization, "id">>;

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at"> &
  Partial<Pick<Profile, "avatar_url" | "bio" | "phone" | "timezone" | "is_active">>;

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
    };
  };
}
