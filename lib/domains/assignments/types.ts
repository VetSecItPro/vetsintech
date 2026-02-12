// ============================================================================
// Assignment Domain Types
// Maps to: assignments, assignment_submissions, submission_files
// ============================================================================

// ---------- Enums (match DB enums) ----------

export type AssignmentStatus = "draft" | "published" | "archived";
export type SubmissionStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "graded"
  | "returned";

// ---------- Rubric Types ----------

export interface RubricCriterion {
  name: string;
  description: string;
  maxPoints: number;
}

// ---------- Core Entities ----------

export interface Assignment {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  max_score: number;
  weight: number;
  due_date: string | null;
  allow_late_submissions: boolean;
  late_penalty_percent: number;
  max_file_size_mb: number;
  allowed_file_types: string[];
  max_attempts: number | null;
  status: AssignmentStatus;
  rubric: RubricCriterion[] | null;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  submitted_at: string | null;
  status: SubmissionStatus;
  attempt_number: number;
  score: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  late: boolean;
  late_penalty_applied: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

// ---------- Joined / Extended Types ----------

export interface AssignmentWithSubmissionCount extends Assignment {
  submission_count: number;
  graded_count: number;
}

export interface AssignmentWithStudentSubmission extends Assignment {
  student_submission: AssignmentSubmission | null;
}

export interface SubmissionWithFiles extends AssignmentSubmission {
  files: SubmissionFile[];
}

export interface SubmissionWithStudent extends AssignmentSubmission {
  student: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  files: SubmissionFile[];
}

// ---------- Input Types (for create/update) ----------

export interface CreateAssignmentInput {
  course_id: string;
  module_id?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  max_score?: number;
  weight?: number;
  due_date?: string | null;
  allow_late_submissions?: boolean;
  late_penalty_percent?: number;
  max_file_size_mb?: number;
  allowed_file_types?: string[];
  max_attempts?: number | null;
  status?: AssignmentStatus;
  rubric?: RubricCriterion[] | null;
  organization_id: string;
  created_by: string;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string | null;
  instructions?: string | null;
  max_score?: number;
  weight?: number;
  due_date?: string | null;
  allow_late_submissions?: boolean;
  late_penalty_percent?: number;
  max_file_size_mb?: number;
  allowed_file_types?: string[];
  max_attempts?: number | null;
  status?: AssignmentStatus;
  rubric?: RubricCriterion[] | null;
  module_id?: string | null;
}

export interface SubmitAssignmentInput {
  assignment_id: string;
  student_id: string;
  content?: string | null;
  organization_id: string;
}

export interface GradeSubmissionInput {
  score: number;
  feedback?: string | null;
  graded_by: string;
}
