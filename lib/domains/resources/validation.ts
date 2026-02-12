import { z } from "zod/v4";

// ============================================================================
// Resource Schemas
// ============================================================================

export const resourceTypeSchema = z.enum([
  "pdf",
  "slide",
  "document",
  "spreadsheet",
  "video",
  "link",
  "repo",
  "other",
]);

export const createResourceSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(300, "Title must be under 300 characters"),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional(),
  type: resourceTypeSchema,
  file_path: z.string().max(1000).optional(),
  file_size: z
    .number()
    .int()
    .nonnegative("File size must be non-negative")
    .optional(),
  file_name: z.string().max(500).optional(),
  external_url: z.url("Must be a valid URL").optional(),
  course_id: z.uuid("Invalid course ID").optional(),
  tags: z
    .array(z.string().max(50, "Tag must be under 50 characters"))
    .max(20, "Maximum 20 tags")
    .optional(),
});

export const updateResourceSchema = createResourceSchema.partial().extend({
  course_id: z.uuid("Invalid course ID").nullable().optional(),
});

export type CreateResourceFormData = z.infer<typeof createResourceSchema>;
export type UpdateResourceFormData = z.infer<typeof updateResourceSchema>;
