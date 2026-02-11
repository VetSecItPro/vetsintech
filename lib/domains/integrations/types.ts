export type ExternalPlatform = "coursera" | "pluralsight" | "udemy";

export interface PlatformConfig {
  id: string;
  organization_id: string;
  platform: ExternalPlatform;
  is_enabled: boolean;
  credentials: Record<string, string>;
  sync_frequency_minutes: number;
  last_synced_at: string | null;
  sync_status: "idle" | "syncing" | "error";
  sync_error: string | null;
}

export interface ExternalEnrollment {
  id: string;
  organization_id: string;
  user_id: string;
  platform: ExternalPlatform;
  external_course_id: string;
  external_course_title: string;
  enrolled_at: string | null;
}

export interface ExternalProgress {
  id: string;
  external_enrollment_id: string;
  progress_percentage: number;
  status: "in_progress" | "completed";
  completed_at: string | null;
  time_spent_minutes: number | null;
  last_activity_at: string | null;
  synced_at: string;
}

export interface ExternalStudentProgress {
  userId: string;
  fullName: string;
  email: string;
  platform: ExternalPlatform;
  courseTitle: string;
  progressPercentage: number;
  status: string;
  lastActivityAt: string | null;
}

export interface PlatformAdapter {
  platform: ExternalPlatform;
  validateCredentials(
    credentials: Record<string, string>
  ): Promise<boolean>;
  fetchEnrollments(
    credentials: Record<string, string>,
    orgUserEmails: string[]
  ): Promise<
    {
      courseId: string;
      courseTitle: string;
      userEmail: string;
      enrolledAt: string | null;
    }[]
  >;
  fetchProgress(
    credentials: Record<string, string>,
    enrollments: { courseId: string; userEmail: string }[]
  ): Promise<
    {
      courseId: string;
      userEmail: string;
      progressPercentage: number;
      status: string;
      completedAt: string | null;
      timeSpentMinutes: number | null;
      lastActivityAt: string | null;
    }[]
  >;
}
