import { z } from "zod/v4";

// ============================================================================
// Learning Path Schemas
// ============================================================================

export const learningPathStatusSchema = z.enum(["draft", "published", "archived"]);

export const difficultyLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const learningPathSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional(),
  thumbnail_url: z.url("Must be a valid URL").optional(),
  estimated_hours: z
    .number()
    .int()
    .positive("Estimated hours must be positive")
    .max(10000, "Estimated hours seems too high")
    .optional(),
  difficulty_level: difficultyLevelSchema.optional(),
  tags: z.array(z.string().max(50)).max(20, "Maximum 20 tags").optional(),
});

export type LearningPathFormData = z.infer<typeof learningPathSchema>;

// ============================================================================
// Path Course Schemas
// ============================================================================

export const addCourseToPathSchema = z.object({
  course_id: z.uuid("Invalid course ID"),
  is_required: z.boolean().optional(),
});

export const addCoursesToPathSchema = z.object({
  courses: z
    .array(addCourseToPathSchema)
    .min(1, "At least one course is required")
    .max(50, "Maximum 50 courses per request"),
});

export const reorderPathCoursesSchema = z.object({
  course_ids: z
    .array(z.uuid("Invalid course ID"))
    .min(1, "At least one course ID is required"),
});

export type AddCourseToPathFormData = z.infer<typeof addCourseToPathSchema>;
export type ReorderPathCoursesFormData = z.infer<typeof reorderPathCoursesSchema>;
