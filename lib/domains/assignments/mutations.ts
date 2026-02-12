import { createClient } from "@/lib/supabase/server";
import type {
  Assignment,
  AssignmentSubmission,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  SubmitAssignmentInput,
  GradeSubmissionInput,
} from "./types";
import { getAssignmentById, getStudentAttempts } from "./queries";
import { calculateLatePenalty, isOverdue } from "./utils";

// ============================================================================
// Assignment Mutations
// ============================================================================

export async function createAssignment(
  input: CreateAssignmentInput
): Promise<Assignment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      course_id: input.course_id,
      module_id: input.module_id || null,
      title: input.title,
      description: input.description || null,
      instructions: input.instructions || null,
      max_score: input.max_score ?? 100,
      weight: input.weight ?? 1.0,
      due_date: input.due_date || null,
      allow_late_submissions: input.allow_late_submissions ?? false,
      late_penalty_percent: input.late_penalty_percent ?? 0,
      max_file_size_mb: input.max_file_size_mb ?? 50,
      allowed_file_types:
        input.allowed_file_types ?? ["pdf", "doc", "docx", "txt", "zip", "png", "jpg"],
      max_attempts: input.max_attempts ?? 1,
      status: input.status ?? "draft",
      rubric: input.rubric || null,
      organization_id: input.organization_id,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAssignment(
  assignmentId: string,
  input: UpdateAssignmentInput
): Promise<Assignment> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.instructions !== undefined) payload.instructions = input.instructions;
  if (input.max_score !== undefined) payload.max_score = input.max_score;
  if (input.weight !== undefined) payload.weight = input.weight;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.allow_late_submissions !== undefined)
    payload.allow_late_submissions = input.allow_late_submissions;
  if (input.late_penalty_percent !== undefined)
    payload.late_penalty_percent = input.late_penalty_percent;
  if (input.max_file_size_mb !== undefined)
    payload.max_file_size_mb = input.max_file_size_mb;
  if (input.allowed_file_types !== undefined)
    payload.allowed_file_types = input.allowed_file_types;
  if (input.max_attempts !== undefined) payload.max_attempts = input.max_attempts;
  if (input.status !== undefined) payload.status = input.status;
  if (input.rubric !== undefined) payload.rubric = input.rubric;
  if (input.module_id !== undefined) payload.module_id = input.module_id;

  const { data, error } = await supabase
    .from("assignments")
    .update(payload)
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) throw error;
}

// ============================================================================
// Submission Mutations
// ============================================================================

/**
 * Submit an assignment.
 *
 * 1. Verify the assignment exists and is published
 * 2. Check max attempts not exceeded
 * 3. Calculate if submission is late
 * 4. Create submission record with appropriate status
 */
export async function submitAssignment(
  input: SubmitAssignmentInput
): Promise<AssignmentSubmission> {
  const supabase = await createClient();

  // 1. Load assignment
  const assignment = await getAssignmentById(input.assignment_id);
  if (!assignment) {
    throw new Error("Assignment not found");
  }
  if (assignment.status !== "published") {
    throw new Error("Assignment is not available for submission");
  }

  // 2. Check max attempts
  const previousAttempts = await getStudentAttempts(
    input.assignment_id,
    input.student_id
  );

  const completedAttempts = previousAttempts.filter(
    (a) => a.status === "submitted" || a.status === "graded" || a.status === "returned"
  );

  if (
    assignment.max_attempts !== null &&
    completedAttempts.length >= assignment.max_attempts
  ) {
    throw new Error(
      `Maximum attempts reached (${assignment.max_attempts})`
    );
  }

  const attemptNumber = previousAttempts.length + 1;

  // 3. Check if late
  const now = new Date();
  const late = assignment.due_date ? isOverdue(assignment.due_date) : false;

  if (late && !assignment.allow_late_submissions) {
    throw new Error("This assignment is past due and does not accept late submissions");
  }

  const latePenalty = late
    ? calculateLatePenalty(assignment.due_date!, assignment.late_penalty_percent)
    : 0;

  // 4. Create submission
  const { data, error } = await supabase
    .from("assignment_submissions")
    .insert({
      assignment_id: input.assignment_id,
      student_id: input.student_id,
      content: input.content || null,
      submitted_at: now.toISOString(),
      status: "submitted" as const,
      attempt_number: attemptNumber,
      late,
      late_penalty_applied: latePenalty,
      organization_id: input.organization_id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Grade a submission.
 * Sets the score, feedback, grader, and updates status to 'graded'.
 */
export async function gradeSubmission(
  submissionId: string,
  input: GradeSubmissionInput
): Promise<AssignmentSubmission> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("assignment_submissions")
    .update({
      score: input.score,
      feedback: input.feedback || null,
      graded_by: input.graded_by,
      graded_at: now,
      status: "graded" as const,
    })
    .eq("id", submissionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Return a submission to the student for revision.
 * Sets status to 'returned' with feedback.
 */
export async function returnSubmission(
  submissionId: string,
  feedback: string,
  graderId: string
): Promise<AssignmentSubmission> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assignment_submissions")
    .update({
      feedback,
      graded_by: graderId,
      status: "returned" as const,
    })
    .eq("id", submissionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
