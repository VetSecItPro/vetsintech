import { z } from "zod/v4";

// ============================================================================
// Grade Category
// ============================================================================

export const gradeCategorySchema = z.enum([
  "quiz",
  "assignment",
  "participation",
  "extra_credit",
]);

// ============================================================================
// Grade Config Schemas
// ============================================================================

export const upsertGradeConfigSchema = z.object({
  category: gradeCategorySchema,
  weight: z
    .number()
    .min(0, "Weight must be at least 0%")
    .max(100, "Weight must be at most 100%"),
  drop_lowest: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot drop a negative number")
    .max(20, "Maximum 20 dropped")
    .optional()
    .default(0),
});

export const batchGradeConfigSchema = z.object({
  configs: z
    .array(upsertGradeConfigSchema)
    .min(1, "At least one category is required")
    .max(4, "Maximum 4 categories"),
});

// ============================================================================
// Grade Override Schemas
// ============================================================================

export const createGradeOverrideSchema = z.object({
  student_id: z.uuid("Invalid student ID"),
  category: gradeCategorySchema,
  label: z
    .string()
    .min(1, "Label is required")
    .max(200, "Label must be under 200 characters"),
  score: z
    .number()
    .min(0, "Score must be at least 0"),
  max_score: z
    .number()
    .min(0.01, "Max score must be greater than 0")
    .max(10000, "Max score seems too high")
    .optional()
    .default(100),
  notes: z
    .string()
    .max(5000, "Notes must be under 5000 characters")
    .nullable()
    .optional(),
});

export const updateGradeOverrideSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(200, "Label must be under 200 characters")
    .optional(),
  score: z
    .number()
    .min(0, "Score must be at least 0")
    .optional(),
  max_score: z
    .number()
    .min(0.01, "Max score must be greater than 0")
    .max(10000, "Max score seems too high")
    .optional(),
  notes: z
    .string()
    .max(5000, "Notes must be under 5000 characters")
    .nullable()
    .optional(),
  category: gradeCategorySchema.optional(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type UpsertGradeConfigFormData = z.infer<typeof upsertGradeConfigSchema>;
export type BatchGradeConfigFormData = z.infer<typeof batchGradeConfigSchema>;
export type CreateGradeOverrideFormData = z.infer<typeof createGradeOverrideSchema>;
export type UpdateGradeOverrideFormData = z.infer<typeof updateGradeOverrideSchema>;
