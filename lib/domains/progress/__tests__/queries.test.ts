// ============================================================================
// Progress Domain Queries — Integration Tests
// Tests all read operations with mocked Supabase client
// ============================================================================

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as queries from "@/lib/domains/progress/queries";
import type {
  CourseProgress,
  LessonCompletion,
} from "@/lib/domains/progress/types";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the Supabase server module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import the mocked function after mocking
import { createClient } from "@/lib/supabase/server";

// Helper to create a mock query builder that properly chains all methods
function createMockQueryBuilder(config: {
  singleResult?: any;
  orderResult?: any;
  eqResult?: any;
  inResult?: any;
} = {}) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Set up terminal methods
  if (config.singleResult !== undefined) {
    builder.single.mockResolvedValue(config.singleResult);
    builder.maybeSingle.mockResolvedValue(config.singleResult);
  }

  if (config.orderResult !== undefined) {
    builder.order.mockResolvedValue(config.orderResult);
  }

  // For count queries, .eq() returns the result directly
  if (config.eqResult !== undefined) {
    let eqCount = 0;
    builder.eq.mockImplementation(()  => {
      eqCount++;
      // Return result on the last .eq() call (usually 3 for count queries)
      if (eqCount >= 3) {
        return Promise.resolve(config.eqResult);
      }
      return builder;
    });
  }

  if (config.inResult !== undefined) {
    builder.in.mockResolvedValue(config.inResult);
  }

  return builder;
}

// Mock Supabase client
let mockSupabase: any;

beforeEach(() => {
  mockSupabase = {
    from: vi.fn(),
  };
  vi.mocked(createClient).mockResolvedValue(mockSupabase as SupabaseClient);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// getCourseProgress
// ============================================================================

describe("getCourseProgress", () => {
  it("returns course progress when it exists", async () => {
    const mockProgress: CourseProgress = {
      id: "progress-1",
      user_id: "user-1",
      cohort_id: "cohort-1",
      course_id: "course-1",
      total_lessons: 10,
      completed_lessons: 5,
      progress_percentage: 50,
      last_lesson_id: "lesson-5",
      last_activity_at: "2025-01-15T10:00:00Z",
      started_at: "2025-01-10T10:00:00Z",
      completed_at: null,
      updated_at: "2025-01-15T10:00:00Z",
    };

    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: mockProgress, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getCourseProgress("user-1", "cohort-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("course_progress");
    expect(mockBuilder.select).toHaveBeenCalledWith("*");
    expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockBuilder.eq).toHaveBeenCalledWith("cohort_id", "cohort-1");
    expect(result).toEqual(mockProgress);
  });

  it("returns null when no progress record exists (PGRST116)", async () => {
    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: null, error: { code: "PGRST116", message: "No rows found" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getCourseProgress("user-1", "cohort-1");

    expect(result).toBeNull();
  });

  it("throws error for non-PGRST116 errors", async () => {
    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: null, error: { code: "OTHER_ERROR", message: "Database error" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      queries.getCourseProgress("user-1", "cohort-1")
    ).rejects.toEqual({
      code: "OTHER_ERROR",
      message: "Database error",
    });
  });

  it("returns completed course progress", async () => {
    const mockProgress: CourseProgress = {
      id: "progress-1",
      user_id: "user-1",
      cohort_id: "cohort-1",
      course_id: "course-1",
      total_lessons: 10,
      completed_lessons: 10,
      progress_percentage: 100,
      last_lesson_id: "lesson-10",
      last_activity_at: "2025-01-20T10:00:00Z",
      started_at: "2025-01-10T10:00:00Z",
      completed_at: "2025-01-20T10:00:00Z",
      updated_at: "2025-01-20T10:00:00Z",
    };

    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: mockProgress, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getCourseProgress("user-1", "cohort-1");

    expect(result?.completed_at).toBe("2025-01-20T10:00:00Z");
    expect(result?.progress_percentage).toBe(100);
  });
});

// ============================================================================
// getLessonCompletions
// ============================================================================

describe("getLessonCompletions", () => {
  it("returns all lesson completions ordered by completion time", async () => {
    const mockCompletions: LessonCompletion[] = [
      {
        id: "completion-1",
        user_id: "user-1",
        lesson_id: "lesson-1",
        cohort_id: "cohort-1",
        completed_at: "2025-01-10T10:00:00Z",
        time_spent_seconds: 300,
      },
      {
        id: "completion-2",
        user_id: "user-1",
        lesson_id: "lesson-2",
        cohort_id: "cohort-1",
        completed_at: "2025-01-11T10:00:00Z",
        time_spent_seconds: 450,
      },
    ];

    const mockBuilder = createMockQueryBuilder({
      orderResult: { data: mockCompletions, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getLessonCompletions("user-1", "cohort-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("lesson_completions");
    expect(mockBuilder.select).toHaveBeenCalledWith("*");
    expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockBuilder.eq).toHaveBeenCalledWith("cohort_id", "cohort-1");
    expect(mockBuilder.order).toHaveBeenCalledWith("completed_at", {
      ascending: true,
    });
    expect(result).toEqual(mockCompletions);
  });

  it("returns empty array when no completions exist", async () => {
    const mockBuilder = createMockQueryBuilder({
      orderResult: { data: null, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getLessonCompletions("user-1", "cohort-1");

    expect(result).toEqual([]);
  });

  it("throws error on database failure", async () => {
    const mockBuilder = createMockQueryBuilder({
      orderResult: { data: null, error: { message: "Database error" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      queries.getLessonCompletions("user-1", "cohort-1")
    ).rejects.toEqual({ message: "Database error" });
  });
});

// ============================================================================
// isLessonCompleted
// ============================================================================

describe("isLessonCompleted", () => {
  it("returns true when lesson is completed", async () => {
    const mockBuilder = createMockQueryBuilder({
      eqResult: { count: 1, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.isLessonCompleted(
      "user-1",
      "lesson-1",
      "cohort-1"
    );

    expect(mockSupabase.from).toHaveBeenCalledWith("lesson_completions");
    expect(mockBuilder.select).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });
    expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockBuilder.eq).toHaveBeenCalledWith("lesson_id", "lesson-1");
    expect(mockBuilder.eq).toHaveBeenCalledWith("cohort_id", "cohort-1");
    expect(result).toBe(true);
  });

  it("returns false when lesson is not completed", async () => {
    const mockBuilder = createMockQueryBuilder({
      eqResult: { count: 0, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.isLessonCompleted(
      "user-1",
      "lesson-1",
      "cohort-1"
    );

    expect(result).toBe(false);
  });

  it("returns false when count is null", async () => {
    const mockBuilder = createMockQueryBuilder({
      eqResult: { count: null, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.isLessonCompleted(
      "user-1",
      "lesson-1",
      "cohort-1"
    );

    expect(result).toBe(false);
  });

  it("throws error on database failure", async () => {
    const mockBuilder = createMockQueryBuilder({
      eqResult: { count: null, error: { message: "Database error" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      queries.isLessonCompleted("user-1", "lesson-1", "cohort-1")
    ).rejects.toEqual({ message: "Database error" });
  });
});

// ============================================================================
// getStudentEnrollments
// ============================================================================

describe("getStudentEnrollments", () => {
  it("returns enrollments with progress data", async () => {
    const mockEnrollments = [
      {
        id: "enrollment-1",
        cohort_id: "cohort-1",
        user_id: "user-1",
        enrolled_at: "2025-01-01T00:00:00Z",
        status: "active",
        completed_at: null,
        cohort: {
          id: "cohort-1",
          name: "Winter 2025",
          organization_id: "org-1",
          course: {
            id: "course-1",
            title: "JavaScript Fundamentals",
            slug: "js-fundamentals",
            description: "Learn JavaScript basics",
            category: "programming",
            thumbnail_url: "https://example.com/thumb.jpg",
            estimated_duration_minutes: 600,
          },
        },
      },
    ];

    const mockProgress = [
      {
        cohort_id: "cohort-1",
        completed_lessons: 5,
        total_lessons: 10,
        progress_percentage: 50,
        last_activity_at: "2025-01-15T10:00:00Z",
        started_at: "2025-01-10T10:00:00Z",
        completed_at: null,
      },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder({
      orderResult: { data: mockEnrollments, error: null },
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: mockProgress, error: null },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      return createMockQueryBuilder({});
    });

    const result = await queries.getStudentEnrollments("user-1", "org-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("enrollment-1");
    expect(result[0].course.title).toBe("JavaScript Fundamentals");
    expect(result[0].progress?.completed_lessons).toBe(5);
    expect(result[0].progress?.progress_percentage).toBe(50);
  });

  it("filters by status when provided", async () => {
    const mockEnrollmentBuilder = createMockQueryBuilder({
      orderResult: { data: [], error: null },
    });

    mockSupabase.from.mockReturnValue(mockEnrollmentBuilder);

    await queries.getStudentEnrollments("user-1", "org-1", {
      statuses: ["active", "completed"],
    });

    expect(mockEnrollmentBuilder.in).toHaveBeenCalledWith("status", [
      "active",
      "completed",
    ]);
  });

  it("returns empty array when no enrollments exist", async () => {
    const mockBuilder = createMockQueryBuilder({
      orderResult: { data: null, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getStudentEnrollments("user-1", "org-1");

    expect(result).toEqual([]);
  });

  it("handles enrollments without progress data", async () => {
    const mockEnrollments = [
      {
        id: "enrollment-1",
        cohort_id: "cohort-1",
        user_id: "user-1",
        enrolled_at: "2025-01-01T00:00:00Z",
        status: "active",
        completed_at: null,
        cohort: {
          id: "cohort-1",
          name: "Winter 2025",
          organization_id: "org-1",
          course: {
            id: "course-1",
            title: "JavaScript Fundamentals",
            slug: "js-fundamentals",
            description: null,
            category: null,
            thumbnail_url: null,
            estimated_duration_minutes: null,
          },
        },
      },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder({
      orderResult: { data: mockEnrollments, error: null },
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: [], error: null },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      return createMockQueryBuilder({});
    });

    const result = await queries.getStudentEnrollments("user-1", "org-1");

    expect(result).toHaveLength(1);
    expect(result[0].progress).toBeNull();
  });

  it("throws error on enrollment query failure", async () => {
    const mockBuilder = createMockQueryBuilder({
      orderResult: { data: null, error: { message: "Database error" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      queries.getStudentEnrollments("user-1", "org-1")
    ).rejects.toEqual({ message: "Database error" });
  });

  it("throws error on progress query failure", async () => {
    const mockEnrollments = [
      {
        id: "enrollment-1",
        cohort_id: "cohort-1",
        user_id: "user-1",
        enrolled_at: "2025-01-01T00:00:00Z",
        status: "active",
        completed_at: null,
        cohort: {
          id: "cohort-1",
          name: "Winter 2025",
          organization_id: "org-1",
          course: {
            id: "course-1",
            title: "JavaScript",
            slug: "js",
            description: null,
            category: null,
            thumbnail_url: null,
            estimated_duration_minutes: null,
          },
        },
      },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder({
      orderResult: { data: mockEnrollments, error: null },
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: null, error: { message: "Progress query error" } },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      return createMockQueryBuilder({});
    });

    await expect(
      queries.getStudentEnrollments("user-1", "org-1")
    ).rejects.toEqual({ message: "Progress query error" });
  });
});

// ============================================================================
// getStudentProgressSummary
// ============================================================================

describe("getStudentProgressSummary", () => {
  it("returns summary with all stats calculated correctly", async () => {
    const mockEnrollments = [
      { id: "e1", cohort_id: "c1", status: "active", cohort: {} },
      { id: "e2", cohort_id: "c2", status: "completed", cohort: {} },
      { id: "e3", cohort_id: "c3", status: "active", cohort: {} },
    ];

    const mockProgress = [
      { cohort_id: "c1", completed_at: null },
      { cohort_id: "c2", completed_at: "2025-01-20T00:00:00Z" },
      { cohort_id: "c3", completed_at: null },
    ];

    const mockTimeData = [
      { time_spent_seconds: 1200 },
      { time_spent_seconds: 3600 },
      { time_spent_seconds: 900 },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder({
      inResult: { data: mockEnrollments, error: null },
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: mockProgress, error: null },
    });

    const mockTimeBuilder = createMockQueryBuilder({
      inResult: { data: mockTimeData, error: null },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      if (table === "lesson_completions") return mockTimeBuilder;
      return createMockQueryBuilder({});
    });

    const result = await queries.getStudentProgressSummary("user-1", "org-1");

    expect(result).toEqual({
      total_courses: 3,
      completed_courses: 1,
      in_progress_courses: 2,
      total_time_spent_seconds: 5700,
    });
  });

  it("returns zeros when no enrollments exist", async () => {
    const mockBuilder = createMockQueryBuilder({
      inResult: { data: null, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getStudentProgressSummary("user-1", "org-1");

    expect(result).toEqual({
      total_courses: 0,
      completed_courses: 0,
      in_progress_courses: 0,
      total_time_spent_seconds: 0,
    });
  });

  it("handles null time_spent_seconds values", async () => {
    const mockEnrollments = [
      { id: "e1", cohort_id: "c1", status: "active", cohort: {} },
    ];

    const mockTimeData = [
      { time_spent_seconds: null },
      { time_spent_seconds: 100 },
      { time_spent_seconds: null },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder({
      inResult: { data: mockEnrollments, error: null },
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: [], error: null },
    });

    const mockTimeBuilder = createMockQueryBuilder({
      inResult: { data: mockTimeData, error: null },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      if (table === "lesson_completions") return mockTimeBuilder;
      return createMockQueryBuilder({});
    });

    const result = await queries.getStudentProgressSummary("user-1", "org-1");

    expect(result.total_time_spent_seconds).toBe(100);
  });

  it("throws error on enrollment query failure", async () => {
    const mockBuilder = createMockQueryBuilder({
      inResult: { data: null, error: { message: "Enrollment error" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      queries.getStudentProgressSummary("user-1", "org-1")
    ).rejects.toEqual({ message: "Enrollment error" });
  });
});

// ============================================================================
// getLastAccessedLesson
// ============================================================================

describe("getLastAccessedLesson", () => {
  it("returns last accessed lesson info", async () => {
    const mockData = {
      last_lesson_id: "lesson-5",
      course: { id: "course-1", title: "JavaScript Fundamentals" },
      lesson: { id: "lesson-5", title: "Functions" },
    };

    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: mockData, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getLastAccessedLesson("user-1", "cohort-1");

    expect(result).toEqual({
      lessonId: "lesson-5",
      lessonTitle: "Functions",
      courseId: "course-1",
      courseTitle: "JavaScript Fundamentals",
    });
  });

  it("returns null when no progress record exists", async () => {
    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: null, error: { code: "PGRST116" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getLastAccessedLesson("user-1", "cohort-1");

    expect(result).toBeNull();
  });

  it("returns null when last_lesson_id is null", async () => {
    const mockData = {
      last_lesson_id: null,
      course: { id: "course-1", title: "JavaScript" },
      lesson: null,
    };

    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: mockData, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getLastAccessedLesson("user-1", "cohort-1");

    expect(result).toBeNull();
  });

  it("returns null when lesson data is null", async () => {
    const mockData = {
      last_lesson_id: "lesson-5",
      course: { id: "course-1", title: "JavaScript" },
      lesson: null,
    };

    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: mockData, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getLastAccessedLesson("user-1", "cohort-1");

    expect(result).toBeNull();
  });

  it("throws error on database failure", async () => {
    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: null, error: { code: "OTHER_ERROR", message: "Database error" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      queries.getLastAccessedLesson("user-1", "cohort-1")
    ).rejects.toEqual({ code: "OTHER_ERROR", message: "Database error" });
  });
});

// ============================================================================
// getContinueLearning
// ============================================================================

describe("getContinueLearning", () => {
  it("returns continue learning items sorted by last activity", async () => {
    const mockEnrollments = [
      {
        id: "e1",
        cohort_id: "c1",
        cohort: {
          id: "c1",
          name: "Winter 2025",
          organization_id: "org-1",
          course: {
            id: "course-1",
            title: "JavaScript",
            slug: "js",
            thumbnail_url: "thumb1.jpg",
          },
        },
      },
      {
        id: "e2",
        cohort_id: "c2",
        cohort: {
          id: "c2",
          name: "Spring 2025",
          organization_id: "org-1",
          course: {
            id: "course-2",
            title: "Python",
            slug: "py",
            thumbnail_url: "thumb2.jpg",
          },
        },
      },
    ];

    const mockProgress = [
      {
        cohort_id: "c1",
        course_id: "course-1",
        completed_lessons: 3,
        total_lessons: 10,
        progress_percentage: 30,
        last_lesson_id: "l3",
        last_activity_at: "2025-01-15T10:00:00Z",
        completed_at: null,
      },
      {
        cohort_id: "c2",
        course_id: "course-2",
        completed_lessons: 5,
        total_lessons: 8,
        progress_percentage: 62.5,
        last_lesson_id: "l5",
        last_activity_at: "2025-01-18T10:00:00Z",
        completed_at: null,
      },
    ];

    const mockLessons = [
      { id: "l3", title: "Lesson 3" },
      { id: "l5", title: "Lesson 5" },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder();
    // getContinueLearning uses .eq() at the end, need to set up properly
    let enrollmentEqCount = 0;
    mockEnrollmentBuilder.eq.mockImplementation(() => {
      enrollmentEqCount++;
      if (enrollmentEqCount >= 3) {
        return Promise.resolve({ data: mockEnrollments, error: null });
      }
      return mockEnrollmentBuilder;
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: mockProgress, error: null },
    });

    const mockLessonBuilder = createMockQueryBuilder({
      inResult: { data: mockLessons, error: null },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      if (table === "lessons") return mockLessonBuilder;
      return createMockQueryBuilder({});
    });

    const result = await queries.getContinueLearning("user-1", "org-1");

    expect(result).toHaveLength(2);
    // Should be sorted by most recent activity first (c2 before c1)
    expect(result[0].cohort_id).toBe("c2");
    expect(result[1].cohort_id).toBe("c1");
    expect(result[0].last_lesson_title).toBe("Lesson 5");
  });

  it("excludes completed courses", async () => {
    const mockEnrollments = [
      {
        id: "e1",
        cohort_id: "c1",
        cohort: {
          id: "c1",
          name: "Winter 2025",
          organization_id: "org-1",
          course: {
            id: "course-1",
            title: "JavaScript",
            slug: "js",
            thumbnail_url: null,
          },
        },
      },
    ];

    const mockProgress = [
      {
        cohort_id: "c1",
        course_id: "course-1",
        completed_lessons: 10,
        total_lessons: 10,
        progress_percentage: 100,
        last_lesson_id: "l10",
        last_activity_at: "2025-01-20T10:00:00Z",
        completed_at: "2025-01-20T10:00:00Z",
      },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder();
    let enrollmentEqCount = 0;
    mockEnrollmentBuilder.eq.mockImplementation(() => {
      enrollmentEqCount++;
      if (enrollmentEqCount >= 3) {
        return Promise.resolve({ data: mockEnrollments, error: null });
      }
      return mockEnrollmentBuilder;
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: mockProgress, error: null },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      return createMockQueryBuilder({});
    });

    const result = await queries.getContinueLearning("user-1", "org-1");

    // Completed course should be excluded
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no active enrollments exist", async () => {
    const mockBuilder = createMockQueryBuilder();
    let eqCount = 0;
    mockBuilder.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 3) {
        return Promise.resolve({ data: null, error: null });
      }
      return mockBuilder;
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getContinueLearning("user-1", "org-1");

    expect(result).toEqual([]);
  });

  it("handles enrollments without progress", async () => {
    const mockEnrollments = [
      {
        id: "e1",
        cohort_id: "c1",
        cohort: {
          id: "c1",
          name: "Winter 2025",
          organization_id: "org-1",
          course: {
            id: "course-1",
            title: "JavaScript",
            slug: "js",
            thumbnail_url: null,
          },
        },
      },
    ];

    const mockEnrollmentBuilder = createMockQueryBuilder();
    let enrollmentEqCount = 0;
    mockEnrollmentBuilder.eq.mockImplementation(() => {
      enrollmentEqCount++;
      if (enrollmentEqCount >= 3) {
        return Promise.resolve({ data: mockEnrollments, error: null });
      }
      return mockEnrollmentBuilder;
    });

    const mockProgressBuilder = createMockQueryBuilder({
      inResult: { data: [], error: null },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "enrollments") return mockEnrollmentBuilder;
      if (table === "course_progress") return mockProgressBuilder;
      return createMockQueryBuilder({});
    });

    const result = await queries.getContinueLearning("user-1", "org-1");

    expect(result).toHaveLength(1);
    expect(result[0].progress_percentage).toBe(0);
    expect(result[0].last_lesson_id).toBeNull();
    expect(result[0].last_lesson_title).toBeNull();
  });

  it("throws error on enrollment query failure", async () => {
    const mockBuilder = createMockQueryBuilder();
    let eqCount = 0;
    mockBuilder.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount >= 3) {
        return Promise.resolve({ data: null, error: { message: "Database error" } });
      }
      return mockBuilder;
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(queries.getContinueLearning("user-1", "org-1")).rejects.toEqual(
      { message: "Database error" }
    );
  });
});

// ============================================================================
// getEnrollmentForCourse
// ============================================================================

describe("getEnrollmentForCourse", () => {
  it("returns enrollment when user is enrolled in the course", async () => {
    const mockEnrollment = {
      id: "enrollment-1",
      cohort_id: "cohort-1",
      status: "active",
      cohort: { id: "cohort-1", course_id: "course-1" },
    };

    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: mockEnrollment, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getEnrollmentForCourse("user-1", "course-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("enrollments");
    expect(mockBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockBuilder.eq).toHaveBeenCalledWith("cohort.course_id", "course-1");
    expect(mockBuilder.in).toHaveBeenCalledWith("status", [
      "active",
      "completed",
    ]);
    expect(mockBuilder.limit).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      id: "enrollment-1",
      cohort_id: "cohort-1",
      status: "active",
    });
  });

  it("returns null when user is not enrolled", async () => {
    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: null, error: null },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getEnrollmentForCourse("user-1", "course-1");

    expect(result).toBeNull();
  });

  it("returns null on PGRST116 error", async () => {
    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: null, error: { code: "PGRST116" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await queries.getEnrollmentForCourse("user-1", "course-1");

    expect(result).toBeNull();
  });

  it("throws error on non-PGRST116 database errors", async () => {
    const mockBuilder = createMockQueryBuilder({
      singleResult: { data: null, error: { code: "OTHER_ERROR", message: "Database error" } },
    });
    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      queries.getEnrollmentForCourse("user-1", "course-1")
    ).rejects.toEqual({ code: "OTHER_ERROR", message: "Database error" });
  });
});
