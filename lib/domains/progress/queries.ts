// ============================================================================
// Progress Domain Queries
// Read-only Supabase queries for student progress tracking
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  CourseProgress,
  LessonCompletion,
  EnrollmentWithProgress,
  StudentProgressSummary,
  LastAccessedLesson,
  ContinueLearningItem,
} from "./types";

// ============================================================================
// Course Progress
// ============================================================================

/**
 * Get course progress for a specific user in a specific cohort.
 * Returns null if no progress record exists yet.
 */
export async function getCourseProgress(
  userId: string,
  cohortId: string
): Promise<CourseProgress | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("course_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

// ============================================================================
// Lesson Completions
// ============================================================================

/**
 * Get all lesson completions for a user in a specific cohort.
 * Ordered by completion time ascending.
 */
export async function getLessonCompletions(
  userId: string,
  cohortId: string
): Promise<LessonCompletion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lesson_completions")
    .select("*")
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .limit(2000)
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Check whether a specific lesson has been completed by a user in a cohort.
 */
export async function isLessonCompleted(
  userId: string,
  lessonId: string,
  cohortId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("lesson_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .eq("cohort_id", cohortId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

// ============================================================================
// Student Enrollments with Progress
// ============================================================================

/**
 * Get all enrollments for a student within an organization, joined with
 * course progress and course info. Used for the student dashboard.
 */
export async function getStudentEnrollments(
  userId: string,
  organizationId: string,
  options?: { statuses?: string[] }
): Promise<EnrollmentWithProgress[]> {
  const supabase = await createClient();

  // Fetch enrollments with cohort + course info
  let query = supabase
    .from("enrollments")
    .select(
      `
      id,
      cohort_id,
      user_id,
      enrolled_at,
      status,
      completed_at,
      cohort:cohorts!inner(
        id,
        name,
        organization_id,
        course:courses!inner(
          id,
          title,
          slug,
          description,
          category,
          thumbnail_url,
          estimated_duration_minutes
        )
      )
    `
    )
    .eq("user_id", userId)
    .eq("cohort.organization_id", organizationId);

  if (options?.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }

  const { data: enrollments, error } = await query.order("enrolled_at", {
    ascending: false,
  });

  if (error) throw error;
  if (!enrollments || enrollments.length === 0) return [];

  // Fetch progress for all the user's cohorts in this org
  const cohortIds = enrollments.map((e) => e.cohort_id);
  const { data: progressRows, error: progressError } = await supabase
    .from("course_progress")
    .select(
      "cohort_id, completed_lessons, total_lessons, progress_percentage, last_activity_at, started_at, completed_at"
    )
    .eq("user_id", userId)
    .in("cohort_id", cohortIds);

  if (progressError) throw progressError;

  // Index progress by cohort_id for fast lookup
  const progressMap = new Map(
    (progressRows || []).map((p) => [p.cohort_id, p])
  );

  return enrollments.map((enrollment) => {
    const cohort = enrollment.cohort as unknown as {
      id: string;
      name: string;
      organization_id: string;
      course: {
        id: string;
        title: string;
        slug: string;
        description: string | null;
        category: string | null;
        thumbnail_url: string | null;
        estimated_duration_minutes: number | null;
      };
    };
    const progress = progressMap.get(enrollment.cohort_id) ?? null;

    return {
      id: enrollment.id,
      cohort_id: enrollment.cohort_id,
      user_id: enrollment.user_id,
      enrolled_at: enrollment.enrolled_at,
      status: enrollment.status,
      completed_at: enrollment.completed_at,
      course: cohort.course,
      cohort: { id: cohort.id, name: cohort.name },
      progress: progress
        ? {
            completed_lessons: progress.completed_lessons,
            total_lessons: progress.total_lessons,
            progress_percentage: progress.progress_percentage,
            last_activity_at: progress.last_activity_at,
            started_at: progress.started_at,
            completed_at: progress.completed_at,
          }
        : null,
    };
  });
}

// ============================================================================
// Student Progress Summary
// ============================================================================

/**
 * Aggregate progress summary across all of a student's enrollments in an org.
 * Used for the dashboard overview stats.
 */
export async function getStudentProgressSummary(
  userId: string,
  organizationId: string
): Promise<StudentProgressSummary> {
  const supabase = await createClient();

  // Get all active/completed enrollments in org cohorts
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(
      `
      id,
      cohort_id,
      status,
      cohort:cohorts!inner(id, organization_id)
    `
    )
    .eq("user_id", userId)
    .eq("cohort.organization_id", organizationId)
    .in("status", ["active", "completed"]);

  if (enrollError) throw enrollError;
  if (!enrollments || enrollments.length === 0) {
    return {
      total_courses: 0,
      completed_courses: 0,
      in_progress_courses: 0,
      total_time_spent_seconds: 0,
    };
  }

  const cohortIds = enrollments.map((e) => e.cohort_id);

  // Get progress records
  const { data: progressRows, error: progressError } = await supabase
    .from("course_progress")
    .select("completed_at, cohort_id")
    .eq("user_id", userId)
    .in("cohort_id", cohortIds);

  if (progressError) throw progressError;

  // Get total time spent from lesson completions
  const { data: timeData, error: timeError } = await supabase
    .from("lesson_completions")
    .select("time_spent_seconds")
    .eq("user_id", userId)
    .in("cohort_id", cohortIds);

  if (timeError) throw timeError;

  const totalCourses = enrollments.length;
  const completedCourses = (progressRows || []).filter(
    (p) => p.completed_at !== null
  ).length;
  const totalTimeSpent = (timeData || []).reduce(
    (sum, row) => sum + (row.time_spent_seconds ?? 0),
    0
  );

  return {
    total_courses: totalCourses,
    completed_courses: completedCourses,
    in_progress_courses: totalCourses - completedCourses,
    total_time_spent_seconds: totalTimeSpent,
  };
}

// ============================================================================
// Last Accessed Lesson
// ============================================================================

/**
 * Get info about the last lesson a student accessed in a specific cohort.
 * Returns null if no progress record or no last_lesson_id.
 */
export async function getLastAccessedLesson(
  userId: string,
  cohortId: string
): Promise<LastAccessedLesson | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("course_progress")
    .select(
      `
      last_lesson_id,
      course:courses!inner(id, title),
      lesson:lessons!course_progress_last_lesson_id_fkey(id, title)
    `
    )
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  if (!data.last_lesson_id) return null;

  const course = data.course as unknown as { id: string; title: string };
  const lesson = data.lesson as unknown as { id: string; title: string } | null;

  if (!lesson) return null;

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: course.id,
    courseTitle: course.title,
  };
}

// ============================================================================
// Continue Learning Widget
// ============================================================================

/**
 * Get "continue learning" data for a student's dashboard.
 * Returns active enrollments with progress info, ordered by most recently active.
 */
export async function getContinueLearning(
  userId: string,
  organizationId: string
): Promise<ContinueLearningItem[]> {
  const supabase = await createClient();

  // Get active enrollments with cohort + course info
  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(
      `
      id,
      cohort_id,
      cohort:cohorts!inner(
        id,
        name,
        organization_id,
        course:courses!inner(
          id,
          title,
          slug,
          thumbnail_url
        )
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("cohort.organization_id", organizationId);

  if (error) throw error;
  if (!enrollments || enrollments.length === 0) return [];

  const cohortIds = enrollments.map((e) => e.cohort_id);

  // Get progress for all cohorts
  const { data: progressRows, error: progressError } = await supabase
    .from("course_progress")
    .select(
      `
      cohort_id,
      course_id,
      completed_lessons,
      total_lessons,
      progress_percentage,
      last_lesson_id,
      last_activity_at,
      completed_at
    `
    )
    .eq("user_id", userId)
    .in("cohort_id", cohortIds);

  if (progressError) throw progressError;

  const progressMap = new Map(
    (progressRows || []).map((p) => [p.cohort_id, p])
  );

  // Collect all last_lesson_ids that need title lookups
  const lessonIds = (progressRows || [])
    .map((p) => p.last_lesson_id)
    .filter((id): id is string => id !== null);

  let lessonTitleMap = new Map<string, string>();
  if (lessonIds.length > 0) {
    const { data: lessons, error: lessonError } = await supabase
      .from("lessons")
      .select("id, title")
      .in("id", lessonIds);

    if (lessonError) throw lessonError;
    lessonTitleMap = new Map((lessons || []).map((l) => [l.id, l.title]));
  }

  // Build results, excluding already-completed courses
  const items: ContinueLearningItem[] = enrollments
    .map((enrollment) => {
      const cohort = enrollment.cohort as unknown as {
        id: string;
        name: string;
        organization_id: string;
        course: {
          id: string;
          title: string;
          slug: string;
          thumbnail_url: string | null;
        };
      };
      const progress = progressMap.get(enrollment.cohort_id);

      // Skip completed courses — nothing to "continue"
      if (progress?.completed_at) return null;

      return {
        enrollment_id: enrollment.id,
        cohort_id: enrollment.cohort_id,
        course_id: cohort.course.id,
        course_title: cohort.course.title,
        course_slug: cohort.course.slug,
        course_thumbnail_url: cohort.course.thumbnail_url,
        cohort_name: cohort.name,
        last_lesson_id: progress?.last_lesson_id ?? null,
        last_lesson_title: progress?.last_lesson_id
          ? (lessonTitleMap.get(progress.last_lesson_id) ?? null)
          : null,
        progress_percentage: progress?.progress_percentage ?? 0,
        completed_lessons: progress?.completed_lessons ?? 0,
        total_lessons: progress?.total_lessons ?? 0,
        last_activity_at: progress?.last_activity_at ?? null,
      };
    })
    .filter((item): item is ContinueLearningItem => item !== null);

  // Sort by most recently active first, then by enrollment date
  items.sort((a, b) => {
    const aTime = a.last_activity_at
      ? new Date(a.last_activity_at).getTime()
      : 0;
    const bTime = b.last_activity_at
      ? new Date(b.last_activity_at).getTime()
      : 0;
    return bTime - aTime;
  });

  return items;
}

// ============================================================================
// Enrollment Lookup
// ============================================================================

/**
 * Find a student's enrollment for a specific course (via cohort).
 * Returns null if the student is not enrolled in any active/completed cohort
 * for this course.
 */
export async function getEnrollmentForCourse(
  userId: string,
  courseId: string
): Promise<{ id: string; cohort_id: string; status: string } | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, cohort_id, status, cohort:cohorts!inner(id, course_id)")
    .eq("user_id", userId)
    .eq("cohort.course_id", courseId)
    .in("status", ["active", "completed"])
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data
    ? { id: data.id, cohort_id: data.cohort_id, status: data.status }
    : null;
}
