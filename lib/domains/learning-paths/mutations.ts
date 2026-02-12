import { createClient } from "@/lib/supabase/server";
import type {
  LearningPath,
  LearningPathCourse,
  LearningPathEnrollment,
  CreateLearningPathInput,
  UpdateLearningPathInput,
  AddCourseToPathInput,
} from "./types";

// ============================================================================
// Helper
// ============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ============================================================================
// Learning Path Mutations
// ============================================================================

export async function createLearningPath(
  input: CreateLearningPathInput,
  organizationId: string,
  createdBy: string
): Promise<LearningPath> {
  const supabase = await createClient();

  const slug = generateSlug(input.title);

  // Check for slug collision within the org
  const { data: existing } = await supabase
    .from("learning_paths")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .maybeSingle();

  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data, error } = await supabase
    .from("learning_paths")
    .insert({
      organization_id: organizationId,
      title: input.title,
      slug: finalSlug,
      description: input.description || null,
      thumbnail_url: input.thumbnail_url || null,
      estimated_hours: input.estimated_hours || null,
      difficulty_level: input.difficulty_level || null,
      tags: input.tags || [],
      created_by: createdBy,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLearningPath(
  pathId: string,
  organizationId: string,
  input: UpdateLearningPathInput
): Promise<LearningPath> {
  const supabase = await createClient();

  // Build update payload — only include provided fields
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) {
    payload.title = input.title;
    payload.slug = generateSlug(input.title);
  }
  if (input.description !== undefined) payload.description = input.description;
  if (input.thumbnail_url !== undefined)
    payload.thumbnail_url = input.thumbnail_url;
  if (input.estimated_hours !== undefined)
    payload.estimated_hours = input.estimated_hours;
  if (input.difficulty_level !== undefined)
    payload.difficulty_level = input.difficulty_level;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase
    .from("learning_paths")
    .update(payload)
    .eq("id", pathId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLearningPath(
  pathId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("learning_paths")
    .delete()
    .eq("id", pathId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

// ============================================================================
// Path Course Mutations
// ============================================================================

export async function addCoursesToPath(
  pathId: string,
  courses: AddCourseToPathInput[]
): Promise<LearningPathCourse[]> {
  const supabase = await createClient();

  // Get the next position for this path
  const { data: lastCourse } = await supabase
    .from("learning_path_courses")
    .select("position")
    .eq("learning_path_id", pathId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const startPosition = (lastCourse?.position ?? -1) + 1;

  const inserts = courses.map((c, index) => ({
    learning_path_id: pathId,
    course_id: c.course_id,
    position: startPosition + index,
    is_required: c.is_required ?? true,
  }));

  const { data, error } = await supabase
    .from("learning_path_courses")
    .insert(inserts)
    .select();

  if (error) throw error;
  return data || [];
}

export async function removeCourseFromPath(
  pathId: string,
  courseId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("learning_path_courses")
    .delete()
    .eq("learning_path_id", pathId)
    .eq("course_id", courseId);

  if (error) throw error;
}

export async function reorderPathCourses(
  pathId: string,
  courseIds: string[]
): Promise<void> {
  const supabase = await createClient();

  // Update each course's position based on array position
  const updates = courseIds.map((courseId, index) =>
    supabase
      .from("learning_path_courses")
      .update({ position: index })
      .eq("learning_path_id", pathId)
      .eq("course_id", courseId)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

// ============================================================================
// Enrollment Mutations
// ============================================================================

export async function enrollInPath(
  pathId: string,
  studentId: string,
  organizationId: string
): Promise<LearningPathEnrollment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("learning_path_enrollments")
    .insert({
      learning_path_id: pathId,
      student_id: studentId,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
