// ============================================================================
// Gradebook Domain Types
// Maps to: grade_configs, grade_overrides
// Aggregates: quiz_attempts, assignment_submissions
// ============================================================================

// ---------- Enums (match DB enum) ----------

export type GradeCategory = "quiz" | "assignment" | "participation" | "extra_credit";

// ---------- Core Entities ----------

export interface GradeConfig {
  id: string;
  course_id: string;
  category: GradeCategory;
  weight: number;
  drop_lowest: number;
  organization_id: string;
  created_at: string;
}

export interface GradeOverride {
  id: string;
  course_id: string;
  student_id: string;
  category: GradeCategory;
  label: string;
  score: number;
  max_score: number;
  notes: string | null;
  graded_by: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// ---------- Grade Item (union of score sources) ----------

export interface QuizGradeItem {
  type: "quiz";
  id: string;
  label: string;
  score: number;
  max_score: number;
  date: string;
}

export interface AssignmentGradeItem {
  type: "assignment";
  id: string;
  label: string;
  score: number;
  max_score: number;
  date: string;
}

export interface OverrideGradeItem {
  type: "override";
  id: string;
  label: string;
  score: number;
  max_score: number;
  date: string;
  notes: string | null;
}

export type GradeItem = QuizGradeItem | AssignmentGradeItem | OverrideGradeItem;

// ---------- Summary Types ----------

export interface CategoryGradeSummary {
  category: GradeCategory;
  weight: number;
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
  items: GradeItem[];
}

export interface StudentGradeSummary {
  studentId: string;
  studentName: string;
  categories: CategoryGradeSummary[];
  overallPercentage: number;
  letterGrade: string;
}

export interface CourseGradebook {
  courseId: string;
  configs: GradeConfig[];
  students: StudentGradeSummary[];
}

// ---------- Input Types ----------

export interface UpsertGradeConfigInput {
  course_id: string;
  category: GradeCategory;
  weight: number;
  drop_lowest?: number;
  organization_id: string;
}

export interface CreateGradeOverrideInput {
  course_id: string;
  student_id: string;
  category: GradeCategory;
  label: string;
  score: number;
  max_score?: number;
  notes?: string | null;
  graded_by: string;
  organization_id: string;
}

export interface UpdateGradeOverrideInput {
  label?: string;
  score?: number;
  max_score?: number;
  notes?: string | null;
  category?: GradeCategory;
}
