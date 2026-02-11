import { createClient } from "@/lib/supabase/server";
import type { Cohort } from "./types";

/**
 * Deep-clone a course for a new cohort.
 *
 * Copies the full course hierarchy (course → modules → lessons) with new UUIDs.
 * The cloned content is linked to a new cohort. Original course is untouched.
 *
 * Flow:
 * 1. Create the cohort record pointing at the source course
 * 2. Fetch source course's modules + lessons
 * 3. Clone each module (new UUID, same course_id)
 * 4. Clone each lesson (new UUID, mapped to new module_id)
 *
 * Note: In V1, cohorts reference the SAME course (shared content).
 * Full deep-clone (separate content per cohort) is a V2 feature for
 * when cohort-specific customization is needed.
 */
export async function cloneCourseForCohort(
  sourceCourseId: string,
  cohortData: {
    name: string;
    description?: string;
    starts_at?: string;
    ends_at?: string;
    max_students?: number;
  },
  organizationId: string,
  createdBy: string
): Promise<Cohort> {
  const supabase = await createClient();

  // Verify source course exists and belongs to this org
  const { data: sourceCourse, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", sourceCourseId)
    .eq("organization_id", organizationId)
    .single();

  if (courseError || !sourceCourse) {
    throw new Error("Source course not found");
  }

  // Create the cohort
  const { data: cohort, error: cohortError } = await supabase
    .from("cohorts")
    .insert({
      organization_id: organizationId,
      course_id: sourceCourseId,
      name: cohortData.name,
      description: cohortData.description || null,
      starts_at: cohortData.starts_at || null,
      ends_at: cohortData.ends_at || null,
      max_students: cohortData.max_students || null,
      created_by: createdBy,
      status: "active",
    })
    .select()
    .single();

  if (cohortError) throw cohortError;

  return cohort;
}

/**
 * Enroll a student in a cohort.
 * Enforces max_students limit and prevents duplicate enrollments.
 */
export async function enrollStudent(
  cohortId: string,
  userId: string,
  enrolledBy: string
): Promise<void> {
  const supabase = await createClient();

  // Check cohort capacity
  const { data: cohort, error: cohortError } = await supabase
    .from("cohorts")
    .select("max_students")
    .eq("id", cohortId)
    .single();

  if (cohortError) throw cohortError;

  if (cohort.max_students) {
    const { count, error: countError } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("cohort_id", cohortId)
      .in("status", ["active", "completed"]);

    if (countError) throw countError;
    if ((count || 0) >= cohort.max_students) {
      throw new Error("Cohort is at maximum capacity");
    }
  }

  // Insert enrollment (UNIQUE constraint handles duplicates)
  const { error: enrollError } = await supabase.from("enrollments").insert({
    cohort_id: cohortId,
    user_id: userId,
    enrolled_by: enrolledBy,
    status: "active",
  });

  if (enrollError) {
    if (enrollError.code === "23505") {
      throw new Error("Student is already enrolled in this cohort");
    }
    throw enrollError;
  }
}

/**
 * Unenroll (drop) a student from a cohort.
 */
export async function unenrollStudent(
  cohortId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollments")
    .update({ status: "dropped" })
    .eq("cohort_id", cohortId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Generate a URL-safe slug from a title.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
