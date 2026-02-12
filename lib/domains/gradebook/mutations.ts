// ============================================================================
// Gradebook Domain Mutations
// Write operations for grade configs and overrides
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  GradeConfig,
  GradeOverride,
  UpsertGradeConfigInput,
  CreateGradeOverrideInput,
  UpdateGradeOverrideInput,
} from "./types";

// ============================================================================
// Grade Config Mutations
// ============================================================================

/**
 * Upsert a grade configuration for a course category.
 * Uses the UNIQUE(course_id, category) constraint for conflict resolution.
 */
export async function upsertGradeConfig(
  input: UpsertGradeConfigInput
): Promise<GradeConfig> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grade_configs")
    .upsert(
      {
        course_id: input.course_id,
        category: input.category,
        weight: input.weight,
        drop_lowest: input.drop_lowest ?? 0,
        organization_id: input.organization_id,
      },
      { onConflict: "course_id,category" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Batch upsert all grade configurations for a course.
 * Replaces all category weights at once.
 */
export async function batchUpsertGradeConfigs(
  courseId: string,
  configs: Array<{
    category: string;
    weight: number;
    drop_lowest?: number;
  }>,
  organizationId: string
): Promise<GradeConfig[]> {
  const supabase = await createClient();

  const rows = configs.map((c) => ({
    course_id: courseId,
    category: c.category,
    weight: c.weight,
    drop_lowest: c.drop_lowest ?? 0,
    organization_id: organizationId,
  }));

  const { data, error } = await supabase
    .from("grade_configs")
    .upsert(rows, { onConflict: "course_id,category" })
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Grade Override Mutations
// ============================================================================

/**
 * Create a manual grade entry (participation, extra credit, etc.).
 */
export async function createGradeOverride(
  input: CreateGradeOverrideInput
): Promise<GradeOverride> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grade_overrides")
    .insert({
      course_id: input.course_id,
      student_id: input.student_id,
      category: input.category,
      label: input.label,
      score: input.score,
      max_score: input.max_score ?? 100,
      notes: input.notes || null,
      graded_by: input.graded_by,
      organization_id: input.organization_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a manual grade entry.
 */
export async function updateGradeOverride(
  overrideId: string,
  input: UpdateGradeOverrideInput
): Promise<GradeOverride> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.label !== undefined) payload.label = input.label;
  if (input.score !== undefined) payload.score = input.score;
  if (input.max_score !== undefined) payload.max_score = input.max_score;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.category !== undefined) payload.category = input.category;

  const { data, error } = await supabase
    .from("grade_overrides")
    .update(payload)
    .eq("id", overrideId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a manual grade entry.
 */
export async function deleteGradeOverride(
  overrideId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("grade_overrides")
    .delete()
    .eq("id", overrideId);

  if (error) throw error;
}
