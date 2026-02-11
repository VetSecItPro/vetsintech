// ============================================================================
// Notification & Announcement Domain Types
// Maps to: notifications, announcements tables
// ============================================================================

// ---------- Enums (match DB enums) ----------

export type NotificationType =
  | "announcement"
  | "discussion_reply"
  | "quiz_graded"
  | "enrollment"
  | "course_completed"
  | "certificate_issued"
  | "mention"
  | "cohort_update";

// ---------- Core Entities ----------

export interface Announcement {
  id: string;
  organization_id: string;
  cohort_id: string | null;
  title: string;
  body: Record<string, unknown>; // Tiptap ProseMirror JSON
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

// ---------- Joined / Extended Types ----------

export interface AnnouncementWithAuthor extends Announcement {
  author: { full_name: string };
}

// ---------- Input Types (for create/update) ----------

export interface CreateAnnouncementInput {
  title: string;
  body: Record<string, unknown>; // Tiptap JSON
  cohort_id?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: Record<string, unknown>;
  cohort_id?: string | null;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}
