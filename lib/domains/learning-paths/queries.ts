import { createClient } from "@/lib/supabase/server";
import type {
  LearningPath,
  LearningPathWithCourses,
  LearningPathWithStats,
  LearningPathWithProgress,
  LearningPathEnrollment,
  LearningPathCourseWithDetails,
  LearningPathFilters,
  PathCourseProgress,
} from "./types";

// ============================================================================
// Learning Path Queries
// ============================================================================

export async function getLearningPaths(
  organizationId: string,
  filters?: LearningPathFilters
): Promise<LearningPathWithStats[]> {
  const supabase = await createClient();

  let query = supabase
    .from("learning_paths")
    .select(
      `
      *,
      learning_path_courses(count),
      learning_path_enrollments(count)
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.difficulty_level) {
    query = query.eq("difficulty_level", filters.difficulty_level);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((path) => ({
    ...path,
    tags: path.tags || [],
    course_count:
      (path.learning_path_courses as unknown as { count: number }[])?.[0]
        ?.count ?? 0,
    enrollment_count:
      (path.learning_path_enrollments as unknown as { count: number }[])?.[0]
        ?.count ?? 0,
  }));
}

export async function getLearningPathById(
  pathId: string,
  organizationId: string
): Promise<LearningPath | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", pathId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return { ...data, tags: data.tags || [] };
}

export async function getLearningPathBySlug(
  slug: string,
  organizationId: string
): Promise<LearningPath | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("slug", slug)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return { ...data, tags: data.tags || [] };
}

export async function getLearningPathWithCourses(
  pathId: string,
  organizationId: string
): Promise<LearningPathWithCourses | null> {
  const supabase = await createClient();

  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select("*")
    .eq("id", pathId)
    .eq("organization_id", organizationId)
    .single();

  if (pathError) {
    if (pathError.code === "PGRST116") return null;
    throw pathError;
  }

  const { data: pathCourses, error: coursesError } = await supabase
    .from("learning_path_courses")
    .select(
      `
      *,
      course:courses!inner(id, title, slug, description, thumbnail_url, estimated_duration_minutes, status)
    `
    )
    .eq("learning_path_id", pathId)
    .order("position", { ascending: true });

  if (coursesError) throw coursesError;

  return {
    ...path,
    tags: path.tags || [],
    courses: (pathCourses || []).map((pc) => ({
      ...pc,
      course: pc.course as unknown as LearningPathCourseWithDetails["course"],
    })),
  };
}

// ============================================================================
// Enrollment Queries
// ============================================================================

export async function getStudentPathEnrollments(
  studentId: string
): Promise<LearningPathEnrollment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("learning_path_enrollments")
    .select("*")
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStudentPathEnrollment(
  studentId: string,
  pathId: string
): Promise<LearningPathEnrollment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("learning_path_enrollments")
    .select("*")
    .eq("student_id", studentId)
    .eq("learning_path_id", pathId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================================================
// Progress Queries
// ============================================================================

/**
 * Get progress for a student across all courses in a learning path.
 * Aggregates course_progress from all cohorts the student is enrolled in.
 */
export async function getPathProgress(
  studentId: string,
  pathId: string
): Promise<{ courses: PathCourseProgress[]; overall_percentage: number }> {
  const supabase = await createClient();

  // Get all courses in the path
  const { data: pathCourses, error: pcError } = await supabase
    .from("learning_path_courses")
    .select(
      `
      course_id,
      position,
      is_required,
      course:courses!inner(id, title, slug, description, thumbnail_url, estimated_duration_minutes)
    `
    )
    .eq("learning_path_id", pathId)
    .order("position", { ascending: true });

  if (pcError) throw pcError;
  if (!pathCourses || pathCourses.length === 0) {
    return { courses: [], overall_percentage: 0 };
  }

  // Get progress for all courses this student is enrolled in
  const { data: progressRecords, error: progError } = await supabase
    .from("course_progress")
    .select("course_id, progress_percentage, completed_at")
    .eq("user_id", studentId);

  if (progError) throw progError;

  // Build a map of course_id -> best progress
  const progressMap = new Map<
    string,
    { progress_percentage: number; completed_at: string | null }
  >();
  for (const p of progressRecords || []) {
    const existing = progressMap.get(p.course_id);
    if (!existing || p.progress_percentage > existing.progress_percentage) {
      progressMap.set(p.course_id, {
        progress_percentage: p.progress_percentage,
        completed_at: p.completed_at,
      });
    }
  }

  const courses: PathCourseProgress[] = (pathCourses || []).map((pc) => {
    const course = pc.course as unknown as {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      thumbnail_url: string | null;
      estimated_duration_minutes: number | null;
    };
    const prog = progressMap.get(pc.course_id);
    return {
      course_id: pc.course_id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      estimated_duration_minutes: course.estimated_duration_minutes,
      position: pc.position,
      is_required: pc.is_required,
      progress_percentage: prog?.progress_percentage ?? 0,
      is_completed: prog?.completed_at != null,
    };
  });

  // Overall: average progress across all courses in path
  const total = courses.reduce((sum, c) => sum + c.progress_percentage, 0);
  const overall_percentage =
    courses.length > 0 ? Math.round(total / courses.length) : 0;

  return { courses, overall_percentage };
}

/**
 * Get published learning paths with enrollment + progress data for a student.
 * Used on the student browse page.
 */
export async function getPublishedPathsWithProgress(
  organizationId: string,
  studentId: string
): Promise<LearningPathWithProgress[]> {
  const supabase = await createClient();

  // Get all published paths
  const { data: paths, error: pathsError } = await supabase
    .from("learning_paths")
    .select(
      `
      *,
      learning_path_courses(count)
    `
    )
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("title", { ascending: true });

  if (pathsError) throw pathsError;

  // Get student enrollments
  const { data: enrollments, error: enrollError } = await supabase
    .from("learning_path_enrollments")
    .select("*")
    .eq("student_id", studentId);

  if (enrollError) throw enrollError;

  const enrollmentMap = new Map(
    (enrollments || []).map((e) => [e.learning_path_id, e])
  );

  // For enrolled paths, get progress
  const result: LearningPathWithProgress[] = [];
  for (const path of paths || []) {
    const enrollment = enrollmentMap.get(path.id) || null;
    let progress_percentage = 0;

    if (enrollment) {
      const prog = await getPathProgress(studentId, path.id);
      progress_percentage = prog.overall_percentage;
    }

    result.push({
      ...path,
      tags: path.tags || [],
      course_count:
        (path.learning_path_courses as unknown as { count: number }[])?.[0]
          ?.count ?? 0,
      enrollment,
      progress_percentage,
    });
  }

  return result;
}
