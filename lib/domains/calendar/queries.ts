import { createClient } from "@/lib/supabase/server";
import type {
  CalendarEvent,
  CalendarItem,
  UpcomingDeadline,
} from "./types";
import { differenceInCalendarDays } from "date-fns";

// ============================================================================
// Calendar Event Queries (custom events only)
// ============================================================================

/**
 * Get custom calendar events for an organization within a date range.
 */
export async function getCalendarEvents(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("organization_id", orgId)
    .gte("start_time", startDate)
    .lte("start_time", endDate)
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Aggregated Calendar Items (assignments + quizzes + custom events)
// ============================================================================

/**
 * Get all calendar items for a date range — aggregates:
 * - Assignments with due dates
 * - Quizzes with due dates
 * - Custom calendar events
 */
export async function getCalendarItems(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<CalendarItem[]> {
  const supabase = await createClient();

  // Fetch all three sources in parallel
  const [assignmentsResult, quizzesResult, eventsResult] = await Promise.all([
    // Assignments with due dates in range
    supabase
      .from("assignments")
      .select("id, title, due_date, course_id, courses!inner(title)")
      .eq("organization_id", orgId)
      .eq("status", "published")
      .not("due_date", "is", null)
      .gte("due_date", startDate)
      .lte("due_date", endDate)
      .order("due_date", { ascending: true }),

    // Quizzes with due dates in range (joined through lessons → modules → courses)
    supabase
      .from("quizzes")
      .select(
        "id, title, due_date, lessons!inner(id, modules!inner(id, courses!inner(id, title, organization_id)))"
      )
      .not("due_date", "is", null)
      .gte("due_date", startDate)
      .lte("due_date", endDate)
      .order("due_date", { ascending: true }),

    // Custom calendar events
    supabase
      .from("calendar_events")
      .select("*, courses(title)")
      .eq("organization_id", orgId)
      .gte("start_time", startDate)
      .lte("start_time", endDate)
      .order("start_time", { ascending: true }),
  ]);

  if (assignmentsResult.error) throw assignmentsResult.error;
  if (quizzesResult.error) throw quizzesResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const items: CalendarItem[] = [];

  // Map assignments
  for (const a of assignmentsResult.data || []) {
    const course = a.courses as unknown as { title: string } | null;
    items.push({
      id: a.id,
      title: a.title,
      type: "assignment",
      startTime: a.due_date!,
      endTime: null,
      allDay: false,
      courseId: a.course_id,
      courseName: course?.title || null,
      color: "#ef4444", // red for assignments
      url: `/courses/${a.course_id}/assignments/${a.id}`,
    });
  }

  // Map quizzes
  for (const q of quizzesResult.data || []) {
    const lesson = q.lessons as unknown as {
      id: string;
      modules: { id: string; courses: { id: string; title: string; organization_id: string } };
    } | null;
    // Filter by org
    if (lesson && lesson.modules.courses.organization_id === orgId) {
      const courseData = lesson.modules.courses;
      items.push({
        id: q.id,
        title: q.title,
        type: "quiz",
        startTime: q.due_date!,
        endTime: null,
        allDay: false,
        courseId: courseData.id,
        courseName: courseData.title,
        color: "#3b82f6", // blue for quizzes
        url: null, // quizzes are accessed through lessons
      });
    }
  }

  // Map custom events
  for (const e of eventsResult.data || []) {
    const course = e.courses as unknown as { title: string } | null;
    items.push({
      id: e.id,
      title: e.title,
      type: "event",
      startTime: e.start_time,
      endTime: e.end_time,
      allDay: e.all_day,
      courseId: e.course_id,
      courseName: course?.title || null,
      color: e.color || "#22c55e", // green for events
      url: null,
    });
  }

  // Sort all items by startTime
  items.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return items;
}

// ============================================================================
// Student Deadline Queries
// ============================================================================

/**
 * Get upcoming deadlines for a student based on enrolled courses.
 * Used by the dashboard widget.
 */
export async function getUpcomingDeadlines(
  studentId: string,
  daysAhead: number = 7
): Promise<UpcomingDeadline[]> {
  const supabase = await createClient();
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Also include overdue items from the past 30 days
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);

  // Get student enrollments to know which courses they have
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("cohort_id, cohorts!inner(course_id)")
    .eq("user_id", studentId)
    .eq("status", "active");

  if (enrollError) throw enrollError;
  if (!enrollments || enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => {
    const cohort = e.cohorts as unknown as { course_id: string };
    return cohort.course_id;
  });

  const uniqueCourseIds = [...new Set(courseIds)];

  // Fetch assignment deadlines and quiz deadlines in parallel
  const [assignmentsResult, quizzesResult] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_date, course_id, courses!inner(title)")
      .in("course_id", uniqueCourseIds)
      .eq("status", "published")
      .not("due_date", "is", null)
      .gte("due_date", pastDate.toISOString())
      .lte("due_date", futureDate.toISOString())
      .order("due_date", { ascending: true }),

    supabase
      .from("quizzes")
      .select(
        "id, title, due_date, lessons!inner(id, modules!inner(id, course_id, courses!inner(id, title)))"
      )
      .not("due_date", "is", null)
      .gte("due_date", pastDate.toISOString())
      .lte("due_date", futureDate.toISOString())
      .order("due_date", { ascending: true }),
  ]);

  if (assignmentsResult.error) throw assignmentsResult.error;
  if (quizzesResult.error) throw quizzesResult.error;

  const deadlines: UpcomingDeadline[] = [];

  // Map assignments
  for (const a of assignmentsResult.data || []) {
    const course = a.courses as unknown as { title: string } | null;
    const dueDate = new Date(a.due_date!);
    const daysUntilDue = differenceInCalendarDays(dueDate, now);

    deadlines.push({
      id: a.id,
      title: a.title,
      type: "assignment",
      dueDate: a.due_date!,
      courseName: course?.title || null,
      courseId: a.course_id,
      isOverdue: daysUntilDue < 0,
      daysUntilDue,
    });
  }

  // Map quizzes (filter to enrolled courses)
  for (const q of quizzesResult.data || []) {
    const lesson = q.lessons as unknown as {
      id: string;
      modules: { id: string; course_id: string; courses: { id: string; title: string } };
    } | null;

    if (lesson && uniqueCourseIds.includes(lesson.modules.course_id)) {
      const courseData = lesson.modules.courses;
      const dueDate = new Date(q.due_date!);
      const daysUntilDue = differenceInCalendarDays(dueDate, now);

      deadlines.push({
        id: q.id,
        title: q.title,
        type: "quiz",
        dueDate: q.due_date!,
        courseName: courseData.title,
        courseId: courseData.id,
        isOverdue: daysUntilDue < 0,
        daysUntilDue,
      });
    }
  }

  // Sort: overdue first (most overdue), then upcoming (soonest first)
  deadlines.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return deadlines;
}

/**
 * Get all upcoming deadlines for a student (no day limit — used for full calendar).
 */
export async function getStudentDeadlines(
  studentId: string
): Promise<UpcomingDeadline[]> {
  return getUpcomingDeadlines(studentId, 365);
}
