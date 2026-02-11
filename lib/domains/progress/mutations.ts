// ============================================================================
// Progress Domain Mutations
// Write operations for lesson completions and progress tracking
//
// Note: The database has a trigger (trg_update_course_progress) that
// automatically updates course_progress when a lesson_completions row is
// inserted. The markLessonComplete function leverages this trigger and does
// NOT manually update course_progress.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { LessonCompletion, LessonCompletionInput } from "./types";

// ============================================================================
// Lesson Completion
// ============================================================================

/**
 * Mark a lesson as completed for a user in a cohort.
 *
 * Inserts a row into lesson_completions. The database trigger
 * (trg_update_course_progress) automatically:
 *   - Upserts course_progress with updated completed_lessons count
 *   - Recalculates progress_percentage
 *   - Updates last_lesson_id and last_activity_at
 *   - Sets started_at on first completion
 *   - Sets completed_at when all required lessons are done
 *
 * The UNIQUE(user_id, lesson_id, cohort_id) constraint prevents duplicates.
 * If the lesson is already completed, the existing record is returned.
 */
export async function markLessonComplete(
  input: LessonCompletionInput
): Promise<LessonCompletion> {
  const supabase = await createClient();

  // Check if already completed (idempotent)
  const { data: existing, error: checkError } = await supabase
    .from("lesson_completions")
    .select("*")
    .eq("user_id", input.user_id)
    .eq("lesson_id", input.lesson_id)
    .eq("cohort_id", input.cohort_id)
    .maybeSingle();

  if (checkError) throw checkError;

  // Already completed — return the existing record
  if (existing) return existing;

  // Insert new completion — trigger handles course_progress update
  const { data, error } = await supabase
    .from("lesson_completions")
    .insert({
      user_id: input.user_id,
      lesson_id: input.lesson_id,
      cohort_id: input.cohort_id,
      time_spent_seconds: input.time_spent_seconds ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Last Accessed / Activity Tracking
// ============================================================================

/**
 * Update the last accessed lesson and activity timestamp for a user in a cohort.
 * Updates course_progress.last_lesson_id and last_activity_at.
 *
 * If no course_progress row exists yet (student hasn't completed any lesson),
 * this creates one with zero progress to track the current position.
 */
export async function updateLastAccessed(
  userId: string,
  cohortId: string,
  lessonId: string
): Promise<void> {
  const supabase = await createClient();

  // Try to update existing course_progress row
  const { data: existing, error: updateError } = await supabase
    .from("course_progress")
    .update({
      last_lesson_id: lessonId,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("cohort_id", cohortId)
    .select("id")
    .maybeSingle();

  if (updateError) throw updateError;

  // If no row existed, create one with zero progress
  if (!existing) {
    // Look up the course_id from the cohort
    const { data: cohort, error: cohortError } = await supabase
      .from("cohorts")
      .select("course_id")
      .eq("id", cohortId)
      .single();

    if (cohortError) throw cohortError;

    // Count total required lessons for this course
    const { count: totalLessons, error: countError } = await supabase
      .from("lessons")
      .select("id, module:modules!inner(course_id)", {
        count: "exact",
        head: true,
      })
      .eq("module.course_id", cohort.course_id)
      .eq("is_required", true);

    if (countError) throw countError;

    const { error: insertError } = await supabase
      .from("course_progress")
      .insert({
        user_id: userId,
        cohort_id: cohortId,
        course_id: cohort.course_id,
        total_lessons: totalLessons ?? 0,
        completed_lessons: 0,
        progress_percentage: 0,
        last_lesson_id: lessonId,
        last_activity_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
  }
}
