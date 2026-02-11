import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  courseSchema,
  moduleSchema,
  lessonSchema,
  cohortSchema,
  quizSchema,
  questionSchema,
  quizOptionSchema,
  courseStatusSchema,
  lessonTypeSchema,
  questionTypeSchema,
} from "@/lib/utils/validation";

// =============================================================================
// loginSchema
// =============================================================================

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.password).toBe("password123");
    }
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password with exactly 8 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email string", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// registerSchema
// =============================================================================

describe("registerSchema", () => {
  const validData = {
    fullName: "John Doe",
    email: "john@example.com",
    password: "Password1",
    confirmPassword: "Password1",
  };

  it("accepts valid input", () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("rejects when passwords do not match", () => {
    const result = registerSchema.safeParse({
      ...validData,
      confirmPassword: "Different1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase letter", () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: "password1",
      confirmPassword: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase letter", () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: "PASSWORD1",
      confirmPassword: "PASSWORD1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without a number", () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: "Passwords",
      confirmPassword: "Passwords",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters even if regex passes", () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: "Pass1",
      confirmPassword: "Pass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({
      ...validData,
      fullName: "A",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 2 characters", () => {
    const result = registerSchema.safeParse({
      ...validData,
      fullName: "AB",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name longer than 100 characters", () => {
    const result = registerSchema.safeParse({
      ...validData,
      fullName: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 100 characters", () => {
    const result = registerSchema.safeParse({
      ...validData,
      fullName: "A".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      ...validData,
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing confirmPassword", () => {
    const result = registerSchema.safeParse({
      fullName: "John Doe",
      email: "john@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// forgotPasswordSchema
// =============================================================================

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty email string", () => {
    const result = forgotPasswordSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// courseSchema
// =============================================================================

describe("courseSchema", () => {
  it("accepts valid minimal input (title only)", () => {
    const result = courseSchema.safeParse({
      title: "My Course",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My Course");
      expect(result.data.description).toBeUndefined();
    }
  });

  it("accepts valid full input with all optional fields", () => {
    const result = courseSchema.safeParse({
      title: "Full Course",
      description: "A detailed course description.",
      category: "Engineering",
      tags: ["react", "typescript"],
      prerequisites: ["JavaScript Basics"],
      estimated_duration_minutes: 120,
      thumbnail_url: "https://example.com/thumb.png",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Full Course");
      expect(result.data.tags).toEqual(["react", "typescript"]);
      expect(result.data.estimated_duration_minutes).toBe(120);
    }
  });

  it("rejects title shorter than 3 characters", () => {
    const result = courseSchema.safeParse({ title: "AB" });
    expect(result.success).toBe(false);
  });

  it("accepts title with exactly 3 characters", () => {
    const result = courseSchema.safeParse({ title: "ABC" });
    expect(result.success).toBe(true);
  });

  it("rejects title longer than 200 characters", () => {
    const result = courseSchema.safeParse({ title: "A".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("accepts title with exactly 200 characters", () => {
    const result = courseSchema.safeParse({ title: "A".repeat(200) });
    expect(result.success).toBe(true);
  });

  it("rejects description longer than 5000 characters", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      description: "A".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative duration", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      estimated_duration_minutes: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero duration", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      estimated_duration_minutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer duration", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      estimated_duration_minutes: 60.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration exceeding 10000", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      estimated_duration_minutes: 10001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts duration at exactly 10000", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      estimated_duration_minutes: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid thumbnail URL", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      thumbnail_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 tags", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 20 tags", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 10 prerequisites", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      prerequisites: Array.from({ length: 11 }, (_, i) => `prereq${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects category longer than 100 characters", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      category: "C".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tag string longer than 50 characters", () => {
    const result = courseSchema.safeParse({
      title: "Valid Title",
      tags: ["A".repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = courseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// courseStatusSchema
// =============================================================================

describe("courseStatusSchema", () => {
  it.each(["draft", "published", "archived"])("accepts '%s'", (status) => {
    const result = courseStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = courseStatusSchema.safeParse("deleted");
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// moduleSchema
// =============================================================================

describe("moduleSchema", () => {
  it("accepts valid input with title only", () => {
    const result = moduleSchema.safeParse({ title: "Module 1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Module 1");
    }
  });

  it("accepts valid input with all optional fields", () => {
    const result = moduleSchema.safeParse({
      title: "Module 1",
      description: "Introduction module",
      is_required: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_required).toBe(true);
    }
  });

  it("rejects title shorter than 2 characters", () => {
    const result = moduleSchema.safeParse({ title: "A" });
    expect(result.success).toBe(false);
  });

  it("accepts title with exactly 2 characters", () => {
    const result = moduleSchema.safeParse({ title: "AB" });
    expect(result.success).toBe(true);
  });

  it("rejects title longer than 200 characters", () => {
    const result = moduleSchema.safeParse({ title: "A".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 2000 characters", () => {
    const result = moduleSchema.safeParse({
      title: "Module 1",
      description: "D".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description with exactly 2000 characters", () => {
    const result = moduleSchema.safeParse({
      title: "Module 1",
      description: "D".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = moduleSchema.safeParse({ description: "Some text" });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// lessonSchema
// =============================================================================

describe("lessonSchema", () => {
  it("accepts valid input with title only", () => {
    const result = lessonSchema.safeParse({ title: "Lesson 1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Lesson 1");
    }
  });

  it("accepts valid input with all optional fields", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      lesson_type: "video",
      video_url: "https://example.com/video.mp4",
      estimated_duration_minutes: 30,
      is_required: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lesson_type).toBe("video");
      expect(result.data.video_url).toBe("https://example.com/video.mp4");
    }
  });

  it("rejects invalid lesson_type", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      lesson_type: "podcast",
    });
    expect(result.success).toBe(false);
  });

  it.each(["text", "video", "quiz", "assignment", "resource"])(
    "accepts lesson_type '%s'",
    (type) => {
      const result = lessonSchema.safeParse({
        title: "Lesson",
        lesson_type: type,
      });
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid video_url", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      video_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title shorter than 2 characters", () => {
    const result = lessonSchema.safeParse({ title: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 200 characters", () => {
    const result = lessonSchema.safeParse({ title: "A".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects negative duration", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      estimated_duration_minutes: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero duration", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      estimated_duration_minutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration exceeding 600", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      estimated_duration_minutes: 601,
    });
    expect(result.success).toBe(false);
  });

  it("accepts duration at exactly 600", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      estimated_duration_minutes: 600,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer duration", () => {
    const result = lessonSchema.safeParse({
      title: "Lesson 1",
      estimated_duration_minutes: 30.5,
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// lessonTypeSchema
// =============================================================================

describe("lessonTypeSchema", () => {
  it.each(["text", "video", "quiz", "assignment", "resource"])(
    "accepts '%s'",
    (type) => {
      const result = lessonTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid type", () => {
    const result = lessonTypeSchema.safeParse("webinar");
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// cohortSchema
// =============================================================================

describe("cohortSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid minimal input", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Cohort Alpha");
      expect(result.data.course_id).toBe(validUUID);
    }
  });

  it("accepts valid full input with all optional fields", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      description: "First cohort",
      starts_at: "2025-06-01T00:00:00Z",
      ends_at: "2025-12-31T23:59:59Z",
      max_students: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.max_students).toBe(50);
    }
  });

  it("rejects invalid UUID for course_id", () => {
    const result = cohortSchema.safeParse({
      course_id: "not-a-uuid",
      name: "Cohort Alpha",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 3 characters", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "AB",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 3 characters", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "ABC",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name longer than 200 characters", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects end date before start date (refinement)", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      starts_at: "2025-12-31T23:59:59Z",
      ends_at: "2025-01-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects end date equal to start date (refinement)", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      starts_at: "2025-06-01T00:00:00Z",
      ends_at: "2025-06-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("passes when only starts_at is provided (no ends_at)", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      starts_at: "2025-06-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("passes when only ends_at is provided (no starts_at)", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      ends_at: "2025-12-31T23:59:59Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative max_students", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      max_students: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero max_students", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      max_students: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects max_students exceeding 10000", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      max_students: 10001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts max_students at exactly 10000", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      max_students: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer max_students", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      max_students: 50.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 2000 characters", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      description: "D".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ISO datetime for starts_at", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      starts_at: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ISO datetime for ends_at", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
      name: "Cohort Alpha",
      ends_at: "2025/12/31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing course_id", () => {
    const result = cohortSchema.safeParse({
      name: "Cohort Alpha",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = cohortSchema.safeParse({
      course_id: validUUID,
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// quizSchema
// =============================================================================

describe("quizSchema", () => {
  it("accepts valid minimal input (title only)", () => {
    const result = quizSchema.safeParse({ title: "Quiz 1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Quiz 1");
    }
  });

  it("accepts valid full input with all optional fields", () => {
    const result = quizSchema.safeParse({
      title: "Final Exam",
      description: "End of course assessment",
      passing_score: 70,
      max_attempts: 3,
      time_limit_minutes: 60,
      shuffle_questions: true,
      show_correct_answers: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.passing_score).toBe(70);
      expect(result.data.shuffle_questions).toBe(true);
    }
  });

  it("rejects title shorter than 2 characters", () => {
    const result = quizSchema.safeParse({ title: "Q" });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 200 characters", () => {
    const result = quizSchema.safeParse({ title: "Q".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects passing_score below 0", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      passing_score: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects passing_score above 100", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      passing_score: 101,
    });
    expect(result.success).toBe(false);
  });

  it("accepts passing_score at boundary 0", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      passing_score: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts passing_score at boundary 100", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      passing_score: 100,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null for max_attempts (nullable)", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      max_attempts: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.max_attempts).toBeNull();
    }
  });

  it("rejects max_attempts exceeding 100", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      max_attempts: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative max_attempts", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      max_attempts: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero max_attempts", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      max_attempts: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null for time_limit_minutes (nullable)", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      time_limit_minutes: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.time_limit_minutes).toBeNull();
    }
  });

  it("rejects time_limit_minutes exceeding 600", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      time_limit_minutes: 601,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer time_limit_minutes", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      time_limit_minutes: 30.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 2000 characters", () => {
    const result = quizSchema.safeParse({
      title: "Quiz 1",
      description: "D".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// questionTypeSchema
// =============================================================================

describe("questionTypeSchema", () => {
  it.each(["multiple_choice", "true_false", "short_answer"])(
    "accepts '%s'",
    (type) => {
      const result = questionTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  );

  it("rejects invalid type", () => {
    const result = questionTypeSchema.safeParse("essay");
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// questionSchema
// =============================================================================

describe("questionSchema", () => {
  it("accepts valid multiple choice question with options", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "What is 2+2?",
      options: [
        { option_text: "3", is_correct: false },
        { option_text: "4", is_correct: true },
        { option_text: "5", is_correct: false },
      ],
      explanation: "Basic arithmetic",
      points: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question_type).toBe("multiple_choice");
      expect(result.data.options).toHaveLength(3);
      expect(result.data.points).toBe(10);
    }
  });

  it("accepts valid true/false question", () => {
    const result = questionSchema.safeParse({
      question_type: "true_false",
      question_text: "The sky is blue.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid short answer question", () => {
    const result = questionSchema.safeParse({
      question_type: "short_answer",
      question_text: "Describe cloud computing in one sentence.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty question_text", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects question_text longer than 5000 characters", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "Q".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts question_text with exactly 5000 characters", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "Q".repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid question_type", () => {
    const result = questionSchema.safeParse({
      question_type: "essay",
      question_text: "Write an essay.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing question_type", () => {
    const result = questionSchema.safeParse({
      question_text: "What is 2+2?",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing question_text", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 options", () => {
    const options = Array.from({ length: 21 }, (_, i) => ({
      option_text: `Option ${i}`,
      is_correct: i === 0,
    }));
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "Pick one",
      options,
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 20 options", () => {
    const options = Array.from({ length: 20 }, (_, i) => ({
      option_text: `Option ${i}`,
      is_correct: i === 0,
    }));
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "Pick one",
      options,
    });
    expect(result.success).toBe(true);
  });

  it("rejects explanation longer than 2000 characters", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "What is 2+2?",
      explanation: "E".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative points", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "What is 2+2?",
      points: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects points exceeding 1000", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "What is 2+2?",
      points: 1001,
    });
    expect(result.success).toBe(false);
  });

  it("accepts points at boundary 0", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "What is 2+2?",
      points: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts points at boundary 1000", () => {
    const result = questionSchema.safeParse({
      question_type: "multiple_choice",
      question_text: "What is 2+2?",
      points: 1000,
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// quizOptionSchema
// =============================================================================

describe("quizOptionSchema", () => {
  it("accepts valid option with required fields", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "Option A",
      is_correct: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.option_text).toBe("Option A");
      expect(result.data.is_correct).toBe(true);
    }
  });

  it("accepts valid option with sort_order", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "Option B",
      is_correct: false,
      sort_order: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBe(2);
    }
  });

  it("rejects empty option_text", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "",
      is_correct: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects option_text longer than 1000 characters", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "O".repeat(1001),
      is_correct: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts option_text with exactly 1000 characters", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "O".repeat(1000),
      is_correct: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing is_correct", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "Option A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing option_text", () => {
    const result = quizOptionSchema.safeParse({
      is_correct: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sort_order", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "Option A",
      is_correct: true,
      sort_order: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean is_correct", () => {
    const result = quizOptionSchema.safeParse({
      option_text: "Option A",
      is_correct: "yes",
    });
    expect(result.success).toBe(false);
  });
});
