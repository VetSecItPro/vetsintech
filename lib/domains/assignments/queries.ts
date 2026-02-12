import { createClient } from "@/lib/supabase/server";
import type {
  Assignment,
  AssignmentSubmission,
  SubmissionWithFiles,
  SubmissionWithStudent,
  SubmissionFile,
} from "./types";

// ============================================================================
// Assignment Queries
// ============================================================================

/**
 * Get all assignments for a course, ordered by creation date.
 */
export async function getAssignmentsByCourse(
  courseId: string
): Promise<Assignment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single assignment by ID.
 */
export async function getAssignmentById(
  assignmentId: string
): Promise<Assignment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

// ============================================================================
// Submission Queries
// ============================================================================

/**
 * Get all submissions for an assignment (admin view).
 * Joins student profile info and files.
 */
export async function getSubmissionsByAssignment(
  assignmentId: string
): Promise<SubmissionWithStudent[]> {
  const supabase = await createClient();

  const { data: submissions, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  if (!submissions || submissions.length === 0) return [];

  // Fetch student profiles for all submissions
  const studentIds = [...new Set(submissions.map((s) => s.student_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", studentIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  // Fetch files for all submissions
  const submissionIds = submissions.map((s) => s.id);
  const { data: files, error: filesError } = await supabase
    .from("submission_files")
    .select("*")
    .in("submission_id", submissionIds);

  if (filesError) throw filesError;

  const filesBySubmission = new Map<string, SubmissionFile[]>();
  for (const file of files || []) {
    const existing = filesBySubmission.get(file.submission_id) || [];
    existing.push(file);
    filesBySubmission.set(file.submission_id, existing);
  }

  return submissions.map((s) => ({
    ...s,
    student: profileMap.get(s.student_id) || {
      id: s.student_id,
      full_name: "Unknown",
      email: "",
      avatar_url: null,
    },
    files: filesBySubmission.get(s.id) || [],
  }));
}

/**
 * Get the current student's submission for an assignment.
 * Returns the latest attempt.
 */
export async function getStudentSubmission(
  assignmentId: string,
  studentId: string
): Promise<SubmissionWithFiles | null> {
  const supabase = await createClient();

  const { data: submission, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!submission) return null;

  return attachFiles(submission);
}

/**
 * Get all attempts for a student on a specific assignment.
 */
export async function getStudentAttempts(
  assignmentId: string,
  studentId: string
): Promise<AssignmentSubmission[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .order("attempt_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single submission by ID with files attached.
 */
export async function getSubmissionById(
  submissionId: string
): Promise<SubmissionWithFiles | null> {
  const supabase = await createClient();

  const { data: submission, error } = await supabase
    .from("assignment_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return attachFiles(submission);
}

/**
 * Get submission counts for multiple assignments (for admin listing).
 */
export async function getSubmissionCounts(
  assignmentIds: string[]
): Promise<Map<string, { total: number; graded: number }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("assignment_id, status")
    .in("assignment_id", assignmentIds)
    .neq("status", "not_started");

  if (error) throw error;

  const counts = new Map<string, { total: number; graded: number }>();
  for (const row of data || []) {
    const existing = counts.get(row.assignment_id) || { total: 0, graded: 0 };
    existing.total++;
    if (row.status === "graded" || row.status === "returned") {
      existing.graded++;
    }
    counts.set(row.assignment_id, existing);
  }

  return counts;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Fetch files for a submission and attach them.
 */
async function attachFiles(
  submission: AssignmentSubmission
): Promise<SubmissionWithFiles> {
  const supabase = await createClient();

  const { data: files, error } = await supabase
    .from("submission_files")
    .select("*")
    .eq("submission_id", submission.id)
    .order("uploaded_at", { ascending: true });

  if (error) throw error;

  return {
    ...submission,
    files: files || [],
  };
}
