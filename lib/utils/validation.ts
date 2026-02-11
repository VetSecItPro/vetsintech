import { z } from "zod/v4";

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be under 100 characters"),
    email: z.email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must include uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ============================================================================
// Course Schemas
// ============================================================================

export const courseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional(),
  category: z.string().max(100, "Category must be under 100 characters").optional(),
  tags: z.array(z.string().max(50)).max(20, "Maximum 20 tags").optional(),
  prerequisites: z
    .array(z.string().max(200))
    .max(10, "Maximum 10 prerequisites")
    .optional(),
  estimated_duration_minutes: z
    .number()
    .int()
    .positive("Duration must be positive")
    .max(10000, "Duration seems too long")
    .optional(),
  thumbnail_url: z.url("Must be a valid URL").optional(),
});

export const courseStatusSchema = z.enum(["draft", "published", "archived"]);

export type CourseFormData = z.infer<typeof courseSchema>;

// ============================================================================
// Module Schemas
// ============================================================================

export const moduleSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be under 2000 characters")
    .optional(),
  is_required: z.boolean().optional(),
});

export type ModuleFormData = z.infer<typeof moduleSchema>;

// ============================================================================
// Lesson Schemas
// ============================================================================

export const lessonTypeSchema = z.enum([
  "text",
  "video",
  "quiz",
  "assignment",
  "resource",
]);

export const lessonSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be under 200 characters"),
  lesson_type: lessonTypeSchema.optional(),
  video_url: z.url("Must be a valid URL").optional(),
  estimated_duration_minutes: z
    .number()
    .int()
    .positive("Duration must be positive")
    .max(600, "Single lesson over 10 hours seems wrong")
    .optional(),
  is_required: z.boolean().optional(),
});

export type LessonFormData = z.infer<typeof lessonSchema>;

// ============================================================================
// Cohort Schemas
// ============================================================================

export const cohortSchema = z
  .object({
    course_id: z.uuid("Invalid course ID"),
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(200, "Name must be under 200 characters"),
    description: z
      .string()
      .max(2000, "Description must be under 2000 characters")
      .optional(),
    starts_at: z.iso.datetime("Invalid start date").optional(),
    ends_at: z.iso.datetime("Invalid end date").optional(),
    max_students: z
      .number()
      .int()
      .positive("Must be a positive number")
      .max(10000, "Maximum 10,000 students per cohort")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        return new Date(data.ends_at) > new Date(data.starts_at);
      }
      return true;
    },
    { message: "End date must be after start date", path: ["ends_at"] }
  );

export type CohortFormData = z.infer<typeof cohortSchema>;

// ============================================================================
// Quiz Schemas
// ============================================================================

export const questionTypeSchema = z.enum([
  "multiple_choice",
  "true_false",
  "short_answer",
]);

export const quizSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be under 2000 characters")
    .optional(),
  passing_score: z
    .number()
    .min(0, "Passing score must be at least 0")
    .max(100, "Passing score must be at most 100")
    .optional(),
  max_attempts: z
    .number()
    .int()
    .positive("Max attempts must be positive")
    .max(100, "Max attempts seems too high")
    .nullable()
    .optional(),
  time_limit_minutes: z
    .number()
    .int()
    .positive("Time limit must be positive")
    .max(600, "Time limit over 10 hours seems wrong")
    .nullable()
    .optional(),
  shuffle_questions: z.boolean().optional(),
  show_correct_answers: z.boolean().optional(),
});

export const quizOptionSchema = z.object({
  option_text: z
    .string()
    .min(1, "Option text is required")
    .max(1000, "Option text must be under 1000 characters"),
  is_correct: z.boolean(),
  sort_order: z.number().int().optional(),
});

export const questionSchema = z.object({
  question_type: questionTypeSchema,
  question_text: z
    .string()
    .min(1, "Question text is required")
    .max(5000, "Question text must be under 5000 characters"),
  options: z
    .array(quizOptionSchema)
    .max(20, "Maximum 20 options per question")
    .optional(),
  explanation: z
    .string()
    .max(2000, "Explanation must be under 2000 characters")
    .optional(),
  points: z
    .number()
    .min(0, "Points must be at least 0")
    .max(1000, "Points seem too high")
    .optional(),
});

export type QuizFormData = z.infer<typeof quizSchema>;
export type QuestionFormData = z.infer<typeof questionSchema>;
