import { createClient } from "@/lib/supabase/server";
import type {
  Course,
  Module,
  Lesson,
  Cohort,
  CreateCourseInput,
  UpdateCourseInput,
  CreateModuleInput,
  UpdateModuleInput,
  CreateLessonInput,
  UpdateLessonInput,
  CreateCohortInput,
  UpdateCohortInput,
} from "./types";

// ============================================================================
// Course Mutations
// ============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createCourse(
  input: CreateCourseInput,
  organizationId: string,
  createdBy: string
): Promise<Course> {
  const supabase = await createClient();

  const slug = generateSlug(input.title);

  // Check for slug collision within the org
  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .maybeSingle();

  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data, error } = await supabase
    .from("courses")
    .insert({
      organization_id: organizationId,
      title: input.title,
      slug: finalSlug,
      description: input.description || null,
      category: input.category || null,
      tags: input.tags || [],
      prerequisites: input.prerequisites || [],
      estimated_duration_minutes: input.estimated_duration_minutes || null,
      thumbnail_url: input.thumbnail_url || null,
      created_by: createdBy,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCourse(
  courseId: string,
  organizationId: string,
  input: UpdateCourseInput
): Promise<Course> {
  const supabase = await createClient();

  // Build update payload — only include provided fields
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) {
    payload.title = input.title;
    payload.slug = generateSlug(input.title);
  }
  if (input.description !== undefined) payload.description = input.description;
  if (input.category !== undefined) payload.category = input.category;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.prerequisites !== undefined)
    payload.prerequisites = input.prerequisites;
  if (input.estimated_duration_minutes !== undefined)
    payload.estimated_duration_minutes = input.estimated_duration_minutes;
  if (input.thumbnail_url !== undefined)
    payload.thumbnail_url = input.thumbnail_url;
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", courseId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCourse(
  courseId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

export async function publishCourse(
  courseId: string,
  organizationId: string
): Promise<Course> {
  return updateCourse(courseId, organizationId, { status: "published" });
}

export async function archiveCourse(
  courseId: string,
  organizationId: string
): Promise<Course> {
  return updateCourse(courseId, organizationId, { status: "archived" });
}

// ============================================================================
// Module Mutations
// ============================================================================

export async function createModule(
  input: CreateModuleInput
): Promise<Module> {
  const supabase = await createClient();

  // Get the next sort_order for this course
  const { data: lastModule } = await supabase
    .from("modules")
    .select("sort_order")
    .eq("course_id", input.course_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastModule?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("modules")
    .insert({
      course_id: input.course_id,
      title: input.title,
      description: input.description || null,
      is_required: input.is_required ?? true,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateModule(
  moduleId: string,
  input: UpdateModuleInput
): Promise<Module> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("modules")
    .update(input)
    .eq("id", moduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteModule(moduleId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", moduleId);

  if (error) throw error;
}

export async function reorderModules(
  courseId: string,
  moduleIds: string[]
): Promise<void> {
  const supabase = await createClient();

  // Update each module's sort_order based on array position
  const updates = moduleIds.map((id, index) =>
    supabase
      .from("modules")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("course_id", courseId)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

// ============================================================================
// Lesson Mutations
// ============================================================================

export async function createLesson(
  input: CreateLessonInput
): Promise<Lesson> {
  const supabase = await createClient();

  // Get the next sort_order
  const { data: lastLesson } = await supabase
    .from("lessons")
    .select("sort_order")
    .eq("module_id", input.module_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastLesson?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: input.module_id,
      title: input.title,
      lesson_type: input.lesson_type || "text",
      content: input.content || null,
      video_url: input.video_url || null,
      estimated_duration_minutes: input.estimated_duration_minutes || null,
      is_required: input.is_required ?? true,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLesson(
  lessonId: string,
  input: UpdateLessonInput
): Promise<Lesson> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lessons")
    .update(input)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (error) throw error;
}

export async function reorderLessons(
  moduleId: string,
  lessonIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const updates = lessonIds.map((id, index) =>
    supabase
      .from("lessons")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("module_id", moduleId)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

// ============================================================================
// Cohort Mutations
// ============================================================================

export async function createCohort(
  input: CreateCohortInput,
  organizationId: string,
  createdBy: string
): Promise<Cohort> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cohorts")
    .insert({
      organization_id: organizationId,
      course_id: input.course_id,
      name: input.name,
      description: input.description || null,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      max_students: input.max_students || null,
      created_by: createdBy,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCohort(
  cohortId: string,
  organizationId: string,
  input: UpdateCohortInput
): Promise<Cohort> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cohorts")
    .update(input)
    .eq("id", cohortId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCohort(
  cohortId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cohorts")
    .delete()
    .eq("id", cohortId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}
