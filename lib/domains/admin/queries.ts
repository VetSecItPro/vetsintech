// ============================================================================
// Admin Domain Queries
// Aggregated read-only Supabase queries for the admin analytics dashboard
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  DashboardStats,
  EnrollmentTrend,
  CourseAnalytics,
  StudentProgressRow,
} from "./types";

// ============================================================================
// Dashboard Stats
// ============================================================================

/**
 * Fetch high-level dashboard statistics for a given organization.
 * Aggregates data from profiles, enrollments, course_progress, quiz_attempts,
 * courses, and cohorts tables — all scoped by organization_id.
 */
export async function getDashboardStats(
  orgId: string
): Promise<DashboardStats> {
  const supabase = await createClient();

  const defaults: DashboardStats = {
    totalStudents: 0,
    activeEnrollments: 0,
    completionRate: 0,
    activeCourses: 0,
    totalCohorts: 0,
    avgQuizScore: 0,
  };

  try {
    // Run independent queries in parallel for performance
    const [
      studentsRes,
      enrollmentsRes,
      coursesRes,
      cohortsRes,
      progressRes,
      quizRes,
    ] = await Promise.all([
      // Total students: profiles tied to this org with the student role
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),

      // Active enrollments
      supabase
        .from("enrollments")
        .select("id, cohort:cohorts!inner(organization_id)", {
          count: "exact",
          head: true,
        })
        .eq("cohort.organization_id", orgId)
        .eq("status", "active"),

      // Active (published) courses
      supabase
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "published"),

      // Total cohorts
      supabase
        .from("cohorts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId),

      // Average completion rate from course_progress
      supabase
        .from("course_progress")
        .select(
          "progress_percentage, cohort:cohorts!inner(organization_id)"
        )
        .eq("cohort.organization_id", orgId),

      // Average quiz score from quiz_attempts (only completed attempts)
      supabase
        .from("quiz_attempts")
        .select("score, cohort:cohorts!inner(organization_id)")
        .eq("cohort.organization_id", orgId)
        .not("score", "is", null),
    ]);

    // Compute completion rate average
    let completionRate = 0;
    if (progressRes.data && progressRes.data.length > 0) {
      const sum = progressRes.data.reduce(
        (acc: number, row: { progress_percentage: number }) =>
          acc + (row.progress_percentage ?? 0),
        0
      );
      completionRate = sum / progressRes.data.length;
    }

    // Compute average quiz score
    let avgQuizScore = 0;
    if (quizRes.data && quizRes.data.length > 0) {
      const sum = quizRes.data.reduce(
        (acc: number, row: { score: number | null }) =>
          acc + (row.score ?? 0),
        0
      );
      avgQuizScore = sum / quizRes.data.length;
    }

    return {
      totalStudents: studentsRes.count ?? 0,
      activeEnrollments: enrollmentsRes.count ?? 0,
      completionRate: Math.round(completionRate * 10) / 10,
      activeCourses: coursesRes.count ?? 0,
      totalCohorts: cohortsRes.count ?? 0,
      avgQuizScore: Math.round(avgQuizScore * 10) / 10,
    };
  } catch (error) {
    console.error("[getDashboardStats] Error:", error);
    return defaults;
  }
}

// ============================================================================
// Enrollment Trends
// ============================================================================

/**
 * Get enrollment counts per day for the last N days (default 30).
 * Used for the enrollment trend chart on the admin dashboard.
 */
export async function getEnrollmentTrends(
  orgId: string,
  days: number = 30
): Promise<EnrollmentTrend[]> {
  const supabase = await createClient();

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("enrollments")
      .select("enrolled_at, cohort:cohorts!inner(organization_id)")
      .eq("cohort.organization_id", orgId)
      .gte("enrolled_at", since.toISOString())
      .order("enrolled_at", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Group by date string (YYYY-MM-DD)
    const countsByDate = new Map<string, number>();

    // Pre-fill all dates in range so the chart has no gaps
    for (let d = 0; d <= days; d++) {
      const date = new Date(since);
      date.setDate(since.getDate() + d);
      countsByDate.set(date.toISOString().split("T")[0], 0);
    }

    for (const row of data) {
      const dateKey = new Date(row.enrolled_at).toISOString().split("T")[0];
      countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
    }

    return Array.from(countsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  } catch (error) {
    console.error("[getEnrollmentTrends] Error:", error);
    return [];
  }
}

// ============================================================================
// Course Analytics
// ============================================================================

/**
 * Compute per-course analytics for all published courses in the org.
 * Includes enrollment count, completion rate, average progress, average quiz
 * score, and the "drop-off lesson" (the lesson where most students stopped).
 */
export async function getCourseAnalytics(
  orgId: string
): Promise<CourseAnalytics[]> {
  const supabase = await createClient();

  try {
    // Get all published courses with their cohorts
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, title")
      .eq("organization_id", orgId)
      .eq("status", "published");

    if (coursesError) throw coursesError;
    if (!courses || courses.length === 0) return [];

    // Batch-fetch all cohorts for all courses (avoids N+1)
    const courseIds = courses.map((c) => c.id);
    const { data: allCohorts } = await supabase
      .from("cohorts")
      .select("id, course_id")
      .in("course_id", courseIds)
      .eq("organization_id", orgId);

    const cohortsByCourse = new Map<string, string[]>();
    for (const cohort of allCohorts || []) {
      const list = cohortsByCourse.get(cohort.course_id) || [];
      list.push(cohort.id);
      cohortsByCourse.set(cohort.course_id, list);
    }

    const analytics: CourseAnalytics[] = [];

    for (const course of courses) {
      const cohortIds = cohortsByCourse.get(course.id) ?? [];
      if (cohortIds.length === 0) {
        analytics.push({
          courseId: course.id,
          courseTitle: course.title,
          totalEnrolled: 0,
          completionRate: 0,
          avgProgress: 0,
          avgQuizScore: 0,
          dropOffLesson: null,
        });
        continue;
      }

      // Run sub-queries in parallel
      const [enrollRes, progressRes, quizRes, dropOffRes] = await Promise.all([
        // Total enrolled across all cohorts for this course
        supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .in("cohort_id", cohortIds),

        // Progress data for this course
        supabase
          .from("course_progress")
          .select("progress_percentage, completed_at")
          .eq("course_id", course.id)
          .in("cohort_id", cohortIds),

        // Quiz scores for lessons in this course
        supabase
          .from("quiz_attempts")
          .select("score, quiz:quizzes!inner(lesson:lessons!inner(module:modules!inner(course_id)))")
          .eq("quiz.lesson.module.course_id", course.id)
          .in("cohort_id", cohortIds)
          .not("score", "is", null),

        // Find the drop-off lesson: the last completed lesson for students
        // who haven't completed the course. We look at course_progress
        // rows with no completed_at and join the last_lesson_id to lessons.
        supabase
          .from("course_progress")
          .select("last_lesson_id, last_lesson:lessons(title)")
          .eq("course_id", course.id)
          .in("cohort_id", cohortIds)
          .is("completed_at", null)
          .not("last_lesson_id", "is", null),
      ]);

      // Compute completion rate
      let completionRate = 0;
      let avgProgress = 0;
      if (progressRes.data && progressRes.data.length > 0) {
        const completedCount = progressRes.data.filter(
          (p) => p.completed_at !== null
        ).length;
        completionRate = (completedCount / progressRes.data.length) * 100;

        const progressSum = progressRes.data.reduce(
          (acc, p) => acc + (p.progress_percentage ?? 0),
          0
        );
        avgProgress = progressSum / progressRes.data.length;
      }

      // Compute avg quiz score
      let avgQuizScore = 0;
      if (quizRes.data && quizRes.data.length > 0) {
        const scoreSum = quizRes.data.reduce(
          (acc, a) => acc + ((a as { score: number }).score ?? 0),
          0
        );
        avgQuizScore = scoreSum / quizRes.data.length;
      }

      // Find most common drop-off lesson
      let dropOffLesson: string | null = null;
      if (dropOffRes.data && dropOffRes.data.length > 0) {
        const lessonCounts = new Map<string, { title: string; count: number }>();
        for (const row of dropOffRes.data) {
          const lessonId = row.last_lesson_id as string;
          const lessonData = (row as unknown as Record<string, unknown>)
            .last_lesson as { title: string } | null;
          const title = lessonData?.title ?? "Unknown";
          const existing = lessonCounts.get(lessonId);
          if (existing) {
            existing.count++;
          } else {
            lessonCounts.set(lessonId, { title, count: 1 });
          }
        }
        // Pick the lesson with the highest count
        let maxCount = 0;
        for (const entry of lessonCounts.values()) {
          if (entry.count > maxCount) {
            maxCount = entry.count;
            dropOffLesson = entry.title;
          }
        }
      }

      analytics.push({
        courseId: course.id,
        courseTitle: course.title,
        totalEnrolled: enrollRes.count ?? 0,
        completionRate: Math.round(completionRate * 10) / 10,
        avgProgress: Math.round(avgProgress * 10) / 10,
        avgQuizScore: Math.round(avgQuizScore * 10) / 10,
        dropOffLesson,
      });
    }

    return analytics;
  } catch (error) {
    console.error("[getCourseAnalytics] Error:", error);
    return [];
  }
}

// ============================================================================
// Student Progress Table
// ============================================================================

interface StudentProgressOptions {
  cohortId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch a paginated list of student progress rows for the admin table.
 * Supports filtering by cohort and a search term (matched against full_name
 * or email). Results are ordered by last activity (most recent first).
 */
export async function getStudentProgressTable(
  orgId: string,
  options: StudentProgressOptions = {}
): Promise<StudentProgressRow[]> {
  const { cohortId, search, limit = 25, offset = 0 } = options;
  const supabase = await createClient();

  try {
    // Build the query: enrollments joined with profiles, cohorts, courses, and progress
    let query = supabase
      .from("enrollments")
      .select(
        `
        user_id,
        user:profiles!inner(id, full_name, email),
        cohort:cohorts!inner(id, name, organization_id, course_id, course:courses!inner(id, title)),
        progress:course_progress(progress_percentage, last_activity_at)
      `
      )
      .eq("cohort.organization_id", orgId)
      .eq("status", "active")
      .range(offset, offset + limit - 1);

    if (cohortId) {
      query = query.eq("cohort_id", cohortId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const rows: StudentProgressRow[] = [];

    // Supabase returns joined relations with varying shapes depending on
    // !inner hints and cardinality. Cast through unknown to our known shape.
    type EnrollmentRow = {
      user_id: string;
      user: { id: string; full_name: string; email: string };
      cohort: {
        id: string;
        name: string;
        organization_id: string;
        course_id: string;
        course: { id: string; title: string };
      };
      progress: Array<{
        progress_percentage: number;
        last_activity_at: string | null;
      }> | null;
    };

    const typedData = data as unknown as EnrollmentRow[];

    // Batch-fetch all quiz attempts for visible students (avoids N+1)
    const userIds = [...new Set(typedData.map((r) => r.user_id))];
    const cohortIds = [...new Set(typedData.map((r) => r.cohort.id))];

    const { data: allAttempts } = userIds.length > 0
      ? await supabase
          .from("quiz_attempts")
          .select("user_id, cohort_id, score")
          .in("user_id", userIds)
          .in("cohort_id", cohortIds)
          .not("score", "is", null)
      : { data: [] };

    // Index attempts by user_id:cohort_id for O(1) lookup
    const attemptsByKey = new Map<string, number[]>();
    for (const attempt of allAttempts || []) {
      const key = `${attempt.user_id}:${attempt.cohort_id}`;
      const scores = attemptsByKey.get(key) || [];
      scores.push(attempt.score ?? 0);
      attemptsByKey.set(key, scores);
    }

    for (const row of typedData) {
      const user = row.user;
      const cohort = row.cohort;
      const course = cohort.course;
      const progress = row.progress?.[0];

      // Apply search filter in-app since Supabase .or() across joins is limited
      if (search) {
        const term = search.toLowerCase();
        const nameMatch = user.full_name?.toLowerCase().includes(term);
        const emailMatch = user.email?.toLowerCase().includes(term);
        if (!nameMatch && !emailMatch) continue;
      }

      // Look up pre-fetched quiz scores
      const key = `${user.id}:${cohort.id}`;
      const scores = attemptsByKey.get(key) || [];
      let quizAvg = 0;
      if (scores.length > 0) {
        const sum = scores.reduce((acc, s) => acc + s, 0);
        quizAvg = Math.round((sum / scores.length) * 10) / 10;
      }

      rows.push({
        userId: user.id,
        fullName: user.full_name ?? "Unknown",
        email: user.email ?? "",
        cohortName: cohort.name,
        courseTitle: course.title,
        progressPercentage: progress?.progress_percentage ?? 0,
        lastActivityAt: progress?.last_activity_at ?? null,
        quizAvg,
      });
    }

    // Sort by last activity descending (most recent first)
    rows.sort((a, b) => {
      if (!a.lastActivityAt && !b.lastActivityAt) return 0;
      if (!a.lastActivityAt) return 1;
      if (!b.lastActivityAt) return -1;
      return (
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime()
      );
    });

    return rows;
  } catch (error) {
    console.error("[getStudentProgressTable] Error:", error);
    return [];
  }
}
