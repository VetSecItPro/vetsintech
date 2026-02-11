// ============================================================================
// Progress Domain Types
// Maps to: lesson_completions, course_progress tables
// Related: enrollments, cohorts, courses, modules, lessons
// ============================================================================

import type { EnrollmentStatus } from "@/lib/domains/courses/types";

// ---------- Core Entities ----------

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

// ---------- Joined / Extended Types ----------

/** Enrollment joined with its course progress and course title (for student dashboard) */
export interface EnrollmentWithProgress {
  id: string;
  cohort_id: string;
  user_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  completed_at: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    category: string | null;
    thumbnail_url: string | null;
    estimated_duration_minutes: number | null;
  };
  cohort: {
    id: string;
    name: string;
  };
  progress: {
    completed_lessons: number;
    total_lessons: number;
    progress_percentage: number;
    last_activity_at: string | null;
    started_at: string | null;
    completed_at: string | null;
  } | null;
}

/** Aggregated progress summary for a student across all enrollments in an org */
export interface StudentProgressSummary {
  total_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  total_time_spent_seconds: number;
}

/** Info for the "continue learning" widget on the student dashboard */
export interface ContinueLearningItem {
  enrollment_id: string;
  cohort_id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  course_thumbnail_url: string | null;
  cohort_name: string;
  last_lesson_id: string | null;
  last_lesson_title: string | null;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  last_activity_at: string | null;
}

/** Details about the last accessed lesson for navigation */
export interface LastAccessedLesson {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
}

// ---------- Input Types ----------

export interface LessonCompletionInput {
  user_id: string;
  lesson_id: string;
  cohort_id: string;
  time_spent_seconds?: number;
}
