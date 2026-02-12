// ============================================================================
// Progress Domain Mutations — Integration Tests
// Tests all write operations with mocked Supabase client
// ============================================================================

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as mutations from "@/lib/domains/progress/mutations";
import type { LessonCompletion } from "@/lib/domains/progress/types";

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";

// Helper to create a mock query builder that properly chains
function createMockQueryBuilder(finalResult?: any) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };

  if (finalResult !== undefined) {
    builder.maybeSingle.mockResolvedValue(finalResult);
    builder.single.mockResolvedValue(finalResult);
    // For count queries, set up eq to also return the final result
    if (finalResult.count !== undefined) {
      // Make a special version that returns the result on the last call
      let eqCallCount = 0;
      builder.eq.mockImplementation(() => {
        eqCallCount++;
        // Return result on the last expected .eq() call (typically 2 for count queries)
        if (eqCallCount >= 2) {
          return Promise.resolve(finalResult);
        }
        return builder;
      });
    }
  }

  return builder;
}

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
// markLessonComplete
// ============================================================================

describe("markLessonComplete", () => {
  it("creates new lesson completion when not already completed", async () => {
    const input = {
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      time_spent_seconds: 300,
    };

    const mockCompletion: LessonCompletion = {
      id: "completion-1",
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      completed_at: "2025-01-15T10:00:00Z",
      time_spent_seconds: 300,
    };

    // First check - no existing completion
    const mockCheckBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    // Then insert
    const mockInsertBuilder = createMockQueryBuilder({
      data: mockCompletion,
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "lesson_completions") {
        // First call is check, second is insert
        const calls = mockSupabase.from.mock.calls.length;
        return calls === 1 ? mockCheckBuilder : mockInsertBuilder;
      }
      return createMockQueryBuilder();
    });

    const result = await mutations.markLessonComplete(input);

    expect(mockCheckBuilder.select).toHaveBeenCalledWith("*");
    expect(mockCheckBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockCheckBuilder.eq).toHaveBeenCalledWith("lesson_id", "lesson-1");
    expect(mockCheckBuilder.eq).toHaveBeenCalledWith("cohort_id", "cohort-1");

    expect(mockInsertBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      time_spent_seconds: 300,
    });

    expect(result).toEqual(mockCompletion);
  });

  it("returns existing completion when already completed (idempotent)", async () => {
    const input = {
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
    };

    const existingCompletion: LessonCompletion = {
      id: "completion-1",
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      completed_at: "2025-01-10T10:00:00Z",
      time_spent_seconds: 250,
    };

    const mockBuilder = createMockQueryBuilder({
      data: existingCompletion,
      error: null,
    });

    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await mutations.markLessonComplete(input);

    // Should return existing, not insert
    expect(mockBuilder.insert).not.toHaveBeenCalled();
    expect(result).toEqual(existingCompletion);
  });

  it("defaults time_spent_seconds to 0 when not provided", async () => {
    const input = {
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
    };

    const mockCompletion: LessonCompletion = {
      id: "completion-1",
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      completed_at: "2025-01-15T10:00:00Z",
      time_spent_seconds: 0,
    };

    const mockCheckBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockInsertBuilder = createMockQueryBuilder({
      data: mockCompletion,
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const calls = mockSupabase.from.mock.calls.length;
      return calls === 1 ? mockCheckBuilder : mockInsertBuilder;
    });

    await mutations.markLessonComplete(input);

    expect(mockInsertBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      time_spent_seconds: 0,
    });
  });

  it("throws error on check query failure", async () => {
    const input = {
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
    };

    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: "Database error during check" },
    });

    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(mutations.markLessonComplete(input)).rejects.toEqual({
      message: "Database error during check",
    });
  });

  it("throws error on insert failure", async () => {
    const input = {
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
    };

    const mockCheckBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockInsertBuilder = createMockQueryBuilder({
      data: null,
      error: { message: "Insert failed" },
    });

    mockSupabase.from.mockImplementation(() => {
      const calls = mockSupabase.from.mock.calls.length;
      return calls === 1 ? mockCheckBuilder : mockInsertBuilder;
    });

    await expect(mutations.markLessonComplete(input)).rejects.toEqual({
      message: "Insert failed",
    });
  });

  it("handles database trigger updating course_progress automatically", async () => {
    // This test verifies the mutation doesn't manually update course_progress
    const input = {
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      time_spent_seconds: 300,
    };

    const mockCompletion: LessonCompletion = {
      id: "completion-1",
      user_id: "user-1",
      lesson_id: "lesson-1",
      cohort_id: "cohort-1",
      completed_at: "2025-01-15T10:00:00Z",
      time_spent_seconds: 300,
    };

    const mockCheckBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockInsertBuilder = createMockQueryBuilder({
      data: mockCompletion,
      error: null,
    });

    mockSupabase.from.mockImplementation(() => {
      const calls = mockSupabase.from.mock.calls.length;
      return calls === 1 ? mockCheckBuilder : mockInsertBuilder;
    });

    await mutations.markLessonComplete(input);

    // Verify we only called lesson_completions, not course_progress
    const fromCalls = mockSupabase.from.mock.calls;
    expect(fromCalls.every((call: any) => call[0] === "lesson_completions")).toBe(
      true
    );
  });
});

// ============================================================================
// updateLastAccessed
// ============================================================================

describe("updateLastAccessed", () => {
  it("updates existing course_progress record", async () => {
    const mockUpdateBuilder = createMockQueryBuilder({
      data: { id: "progress-1" },
      error: null,
    });

    mockSupabase.from.mockReturnValue(mockUpdateBuilder);

    await mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5");

    expect(mockSupabase.from).toHaveBeenCalledWith("course_progress");
    expect(mockUpdateBuilder.update).toHaveBeenCalled();
    expect(mockUpdateBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockUpdateBuilder.eq).toHaveBeenCalledWith("cohort_id", "cohort-1");

    // Check that update was called with correct fields
    const updateCall = mockUpdateBuilder.update.mock.calls[0][0];
    expect(updateCall.last_lesson_id).toBe("lesson-5");
    expect(updateCall.last_activity_at).toBeDefined();
    expect(updateCall.updated_at).toBeDefined();
  });

  it("creates new course_progress record when none exists", async () => {
    const mockUpdateBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockCohortBuilder = createMockQueryBuilder({
      data: { course_id: "course-1" },
      error: null,
    });

    // For count query, create special builder that resolves on .eq() call
    const mockCountBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
    };
    // Chain .eq() calls properly
    mockCountBuilder.eq.mockImplementation(() => {
      // Return self for first .eq() call
      return {
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      };
    });

    const mockInsertBuilder: any = {
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      const callCount = mockSupabase.from.mock.calls.length;
      if (table === "course_progress" && callCount === 1) {
        return mockUpdateBuilder;
      }
      if (table === "cohorts") return mockCohortBuilder;
      if (table === "lessons") return mockCountBuilder;
      if (table === "course_progress") return mockInsertBuilder;
      return createMockQueryBuilder();
    });

    await mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5");

    // Verify cohort lookup
    expect(mockCohortBuilder.select).toHaveBeenCalledWith("course_id");
    expect(mockCohortBuilder.eq).toHaveBeenCalledWith("id", "cohort-1");

    // Verify lesson count
    expect(mockCountBuilder.select).toHaveBeenCalled();

    // Verify insert
    expect(mockInsertBuilder.insert).toHaveBeenCalled();
    const insertCall = mockInsertBuilder.insert.mock.calls[0][0];
    expect(insertCall.user_id).toBe("user-1");
    expect(insertCall.cohort_id).toBe("cohort-1");
    expect(insertCall.course_id).toBe("course-1");
    expect(insertCall.total_lessons).toBe(10);
    expect(insertCall.completed_lessons).toBe(0);
    expect(insertCall.progress_percentage).toBe(0);
    expect(insertCall.last_lesson_id).toBe("lesson-5");
  });

  it("sets started_at when creating new progress record", async () => {
    const mockUpdateBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockCohortBuilder = createMockQueryBuilder({
      data: { course_id: "course-1" },
      error: null,
    });

    const mockCountBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      })),
    };

    const mockInsertBuilder: any = {
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      const callCount = mockSupabase.from.mock.calls.length;
      if (table === "course_progress" && callCount === 1) {
        return mockUpdateBuilder;
      }
      if (table === "cohorts") return mockCohortBuilder;
      if (table === "lessons") return mockCountBuilder;
      if (table === "course_progress") return mockInsertBuilder;
      return createMockQueryBuilder();
    });

    await mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5");

    const insertCall = mockInsertBuilder.insert.mock.calls[0][0];
    expect(insertCall.started_at).toBeDefined();
    expect(insertCall.last_activity_at).toBeDefined();
  });

  it("handles null lesson count gracefully", async () => {
    const mockUpdateBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockCohortBuilder = createMockQueryBuilder({
      data: { course_id: "course-1" },
      error: null,
    });

    const mockCountBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ count: null, error: null }),
      })),
    };

    const mockInsertBuilder: any = {
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      const callCount = mockSupabase.from.mock.calls.length;
      if (table === "course_progress" && callCount === 1) {
        return mockUpdateBuilder;
      }
      if (table === "cohorts") return mockCohortBuilder;
      if (table === "lessons") return mockCountBuilder;
      if (table === "course_progress") return mockInsertBuilder;
      return createMockQueryBuilder();
    });

    await mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5");

    const insertCall = mockInsertBuilder.insert.mock.calls[0][0];
    expect(insertCall.total_lessons).toBe(0);
  });

  it("throws error on update failure", async () => {
    const mockBuilder = createMockQueryBuilder({
      data: null,
      error: { message: "Update failed" },
    });

    mockSupabase.from.mockReturnValue(mockBuilder);

    await expect(
      mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5")
    ).rejects.toEqual({ message: "Update failed" });
  });

  it("throws error on cohort lookup failure", async () => {
    const mockUpdateBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockCohortBuilder = createMockQueryBuilder({
      data: null,
      error: { message: "Cohort not found" },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "course_progress") return mockUpdateBuilder;
      if (table === "cohorts") return mockCohortBuilder;
      return createMockQueryBuilder();
    });

    await expect(
      mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5")
    ).rejects.toEqual({ message: "Cohort not found" });
  });

  it("throws error on lesson count failure", async () => {
    const mockUpdateBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockCohortBuilder = createMockQueryBuilder({
      data: { course_id: "course-1" },
      error: null,
    });

    const mockCountBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({
          count: null,
          error: { message: "Count failed" },
        }),
      })),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "course_progress") return mockUpdateBuilder;
      if (table === "cohorts") return mockCohortBuilder;
      if (table === "lessons") return mockCountBuilder;
      return createMockQueryBuilder();
    });

    await expect(
      mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5")
    ).rejects.toEqual({ message: "Count failed" });
  });

  it("throws error on insert failure", async () => {
    const mockUpdateBuilder = createMockQueryBuilder({
      data: null,
      error: null,
    });

    const mockCohortBuilder = createMockQueryBuilder({
      data: { course_id: "course-1" },
      error: null,
    });

    const mockCountBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      })),
    };

    const mockInsertBuilder: any = {
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      const callCount = mockSupabase.from.mock.calls.length;
      if (table === "course_progress" && callCount === 1) {
        return mockUpdateBuilder;
      }
      if (table === "cohorts") return mockCohortBuilder;
      if (table === "lessons") return mockCountBuilder;
      if (table === "course_progress") return mockInsertBuilder;
      return createMockQueryBuilder();
    });

    await expect(
      mutations.updateLastAccessed("user-1", "cohort-1", "lesson-5")
    ).rejects.toEqual({ message: "Insert failed" });
  });

  it("does not return a value (void function)", async () => {
    const mockBuilder = createMockQueryBuilder({
      data: { id: "progress-1" },
      error: null,
    });

    mockSupabase.from.mockReturnValue(mockBuilder);

    const result = await mutations.updateLastAccessed(
      "user-1",
      "cohort-1",
      "lesson-5"
    );

    expect(result).toBeUndefined();
  });
});
