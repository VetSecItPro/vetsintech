import { z } from "zod/v4";

// ============================================================================
// Calendar Event Schemas
// ============================================================================

export const calendarEventTypeSchema = z.enum([
  "custom",
  "office_hours",
  "meeting",
  "deadline",
]);

export const createCalendarEventSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .nullable()
    .optional(),
  event_type: calendarEventTypeSchema.optional(),
  start_time: z.iso.datetime("Invalid start time"),
  end_time: z.iso.datetime("Invalid end time").nullable().optional(),
  all_day: z.boolean().optional(),
  course_id: z.uuid("Invalid course ID").nullable().optional(),
  cohort_id: z.uuid("Invalid cohort ID").nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color (e.g. #3b82f6)")
    .optional(),
  recurring: z.boolean().optional(),
  recurrence_rule: z
    .string()
    .max(500, "Recurrence rule too long")
    .nullable()
    .optional(),
});

export const updateCalendarEventSchema = createCalendarEventSchema.partial();

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const calendarQuerySchema = z.object({
  start: z.iso.datetime("Invalid start date"),
  end: z.iso.datetime("Invalid end date"),
});

export const deadlineQuerySchema = z.object({
  days_ahead: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 day")
    .max(365, "Cannot look ahead more than 365 days")
    .optional(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateCalendarEventFormData = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventFormData = z.infer<typeof updateCalendarEventSchema>;
