import { z } from "zod/v4";

// ============================================================================
// Assignment Schemas
// ============================================================================

export const assignmentStatusSchema = z.enum(["draft", "published", "archived"]);

export const rubricCriterionSchema = z.object({
  name: z
    .string()
    .min(1, "Criterion name is required")
    .max(200, "Criterion name must be under 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be under 1000 characters"),
  maxPoints: z
    .number()
    .min(0, "Points must be at least 0")
    .max(1000, "Points seem too high"),
});

export const createAssignmentSchema = z.object({
  course_id: z.uuid("Invalid course ID"),
  module_id: z.uuid("Invalid module ID").nullable().optional(),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(10000, "Description must be under 10000 characters")
    .nullable()
    .optional(),
  instructions: z
    .string()
    .max(50000, "Instructions must be under 50000 characters")
    .nullable()
    .optional(),
  max_score: z
    .number()
    .min(0, "Max score must be at least 0")
    .max(10000, "Max score seems too high")
    .optional(),
  weight: z
    .number()
    .min(0, "Weight must be at least 0")
    .max(100, "Weight must be at most 100")
    .optional(),
  due_date: z.iso.datetime("Invalid due date").nullable().optional(),
  allow_late_submissions: z.boolean().optional(),
  late_penalty_percent: z
    .number()
    .min(0, "Penalty must be at least 0%")
    .max(100, "Penalty must be at most 100%")
    .optional(),
  max_file_size_mb: z
    .number()
    .int()
    .min(1, "File size must be at least 1 MB")
    .max(500, "File size must be at most 500 MB")
    .optional(),
  allowed_file_types: z
    .array(z.string().max(20))
    .max(30, "Maximum 30 file types")
    .optional(),
  max_attempts: z
    .number()
    .int()
    .positive("Max attempts must be positive")
    .max(100, "Max attempts seems too high")
    .nullable()
    .optional(),
  status: assignmentStatusSchema.optional(),
  rubric: z
    .array(rubricCriterionSchema)
    .max(50, "Maximum 50 rubric criteria")
    .nullable()
    .optional(),
});

export const updateAssignmentSchema = createAssignmentSchema
  .omit({ course_id: true })
  .partial();

// ============================================================================
// Submission Schemas
// ============================================================================

export const submitAssignmentSchema = z.object({
  content: z
    .string()
    .max(100000, "Content must be under 100000 characters")
    .nullable()
    .optional(),
});

// ============================================================================
// Grading Schemas
// ============================================================================

export const gradeSubmissionSchema = z.object({
  score: z
    .number()
    .min(0, "Score must be at least 0"),
  feedback: z
    .string()
    .max(50000, "Feedback must be under 50000 characters")
    .nullable()
    .optional(),
});

export const returnSubmissionSchema = z.object({
  feedback: z
    .string()
    .min(1, "Feedback is required when returning a submission")
    .max(50000, "Feedback must be under 50000 characters"),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateAssignmentFormData = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentFormData = z.infer<typeof updateAssignmentSchema>;
export type SubmitAssignmentFormData = z.infer<typeof submitAssignmentSchema>;
export type GradeSubmissionFormData = z.infer<typeof gradeSubmissionSchema>;
