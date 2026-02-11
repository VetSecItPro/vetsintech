import { createClient } from "@/lib/supabase/server";
import type {
  Course,
  CourseWithStats,
  CourseWithModules,
  Module,
  ModuleWithLessons,
  Lesson,
  CohortWithCourse,
  CohortWithEnrollments,
  CourseFilters,
  CohortFilters,
} from "./types";

// ============================================================================
// Course Queries
// ============================================================================

export async function getCourses(
  organizationId: string,
  filters?: CourseFilters
): Promise<CourseWithStats[]> {
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select(
      `
      *,
      modules(count),
      cohorts(count)
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  // Supabase returns nested aggregates — transform to flat stats
  return (data || []).map((course) => ({
    ...course,
    tags: course.tags || [],
    prerequisites: course.prerequisites || [],
    module_count: (course.modules as unknown as { count: number }[])?.[0]
      ?.count ?? 0,
    lesson_count: 0, // Computed separately if needed
    enrollment_count: 0, // Computed via cohorts→enrollments
    cohort_count: (course.cohorts as unknown as { count: number }[])?.[0]
      ?.count ?? 0,
  }));
}

export async function getCourseById(
  courseId: string,
  organizationId: string
): Promise<Course | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return data;
}

export async function getCourseBySlug(
  slug: string,
  organizationId: string
): Promise<Course | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

export async function getCourseWithModules(
  courseId: string,
  organizationId: string
): Promise<CourseWithModules | null> {
  const supabase = await createClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("organization_id", organizationId)
    .single();

  if (courseError) {
    if (courseError.code === "PGRST116") return null;
    throw courseError;
  }

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select(
      `
      *,
      lessons(*)
    `
    )
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (modulesError) throw modulesError;

  // Sort lessons within each module
  const sortedModules = (modules || []).map((mod) => ({
    ...mod,
    lessons: ((mod.lessons as Lesson[]) || []).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  return {
    ...course,
    tags: course.tags || [],
    prerequisites: course.prerequisites || [],
    modules: sortedModules,
  };
}

export async function getCourseCategories(
  organizationId: string
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("category")
    .eq("organization_id", organizationId)
    .not("category", "is", null);

  if (error) throw error;

  const categories = [
    ...new Set((data || []).map((c) => c.category).filter(Boolean)),
  ] as string[];
  return categories.sort();
}

// ============================================================================
// Module Queries
// ============================================================================

export async function getModulesByCourse(
  courseId: string
): Promise<Module[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getModuleWithLessons(
  moduleId: string
): Promise<ModuleWithLessons | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("modules")
    .select(
      `
      *,
      lessons(*)
    `
    )
    .eq("id", moduleId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    lessons: ((data.lessons as Lesson[]) || []).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  };
}

// ============================================================================
// Lesson Queries
// ============================================================================

export async function getLessonsByModule(
  moduleId: string
): Promise<Lesson[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getLessonById(
  lessonId: string
): Promise<Lesson | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

// ============================================================================
// Cohort Queries
// ============================================================================

export async function getCohorts(
  organizationId: string,
  filters?: CohortFilters
): Promise<CohortWithCourse[]> {
  const supabase = await createClient();

  let query = supabase
    .from("cohorts")
    .select(
      `
      *,
      course:courses!inner(id, title, slug),
      enrollments(count)
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.course_id) {
    query = query.eq("course_id", filters.course_id);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((cohort) => ({
    ...cohort,
    course: cohort.course as unknown as CohortWithCourse["course"],
    enrollment_count:
      (cohort.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

export async function getCohortById(
  cohortId: string,
  organizationId: string
): Promise<CohortWithCourse | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cohorts")
    .select(
      `
      *,
      course:courses!inner(id, title, slug),
      enrollments(count)
    `
    )
    .eq("id", cohortId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    course: data.course as unknown as CohortWithCourse["course"],
    enrollment_count:
      (data.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0,
  };
}

export async function getCohortWithEnrollments(
  cohortId: string,
  organizationId: string
): Promise<CohortWithEnrollments | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cohorts")
    .select(
      `
      *,
      course:courses!inner(id, title, slug),
      enrollments(
        *,
        user:profiles!inner(id, full_name, email)
      )
    `
    )
    .eq("id", cohortId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    course: data.course as unknown as CohortWithEnrollments["course"],
    enrollments:
      data.enrollments as unknown as CohortWithEnrollments["enrollments"],
  };
}
