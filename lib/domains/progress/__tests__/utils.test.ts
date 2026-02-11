// ============================================================================
// Progress Domain Utilities — Unit Tests
// ============================================================================

import {
  calculateProgressPercentage,
  getNextLesson,
  getPreviousLesson,
  formatTimeSpent,
  isCourseDone,
} from "@/lib/domains/progress/utils";

import type { ModuleWithLessons } from "@/lib/domains/courses/types";
import type { Lesson } from "@/lib/domains/courses/types";

// ---- Fixture Helpers ----

const NOW = "2025-01-01T00:00:00.000Z";

function makeLesson(overrides: Partial<Lesson> & { id: string }): Lesson {
  return {
    module_id: "mod-default",
    title: `Lesson ${overrides.id}`,
    lesson_type: "text",
    content: null,
    video_url: null,
    sort_order: 0,
    estimated_duration_minutes: null,
    is_required: true,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeModule(
  overrides: Partial<ModuleWithLessons> & { id: string; lessons: Lesson[] }
): ModuleWithLessons {
  return {
    course_id: "course-default",
    title: `Module ${overrides.id}`,
    description: null,
    sort_order: 0,
    is_required: true,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

/**
 * Build an array of ModuleWithLessons from a compact spec.
 * Each entry is [moduleId, [lessonId1, lessonId2, ...]].
 */
function buildModules(
  spec: [string, string[]][]
): ModuleWithLessons[] {
  return spec.map(([moduleId, lessonIds], modIndex) =>
    makeModule({
      id: moduleId,
      sort_order: modIndex,
      lessons: lessonIds.map((lid, lessonIndex) =>
        makeLesson({ id: lid, module_id: moduleId, sort_order: lessonIndex })
      ),
    })
  );
}

// ============================================================================
// calculateProgressPercentage
// ============================================================================

describe("calculateProgressPercentage", () => {
  it("returns 0 when totalRequiredLessons is 0", () => {
    expect(calculateProgressPercentage(0, 0)).toBe(0);
  });

  it("returns 0 when totalRequiredLessons is negative", () => {
    expect(calculateProgressPercentage(5, -1)).toBe(0);
  });

  it("returns 0 when no lessons are completed", () => {
    expect(calculateProgressPercentage(0, 10)).toBe(0);
  });

  it("returns 100 when all lessons are completed (1/1)", () => {
    expect(calculateProgressPercentage(1, 1)).toBe(100);
  });

  it("returns 100 when all lessons are completed (10/10)", () => {
    expect(calculateProgressPercentage(10, 10)).toBe(100);
  });

  it("returns 50 for half completion", () => {
    expect(calculateProgressPercentage(5, 10)).toBe(50);
  });

  it("caps at 100 when completed exceeds total", () => {
    expect(calculateProgressPercentage(15, 10)).toBe(100);
  });

  it("rounds fractional results to 2 decimal places", () => {
    // 1/3 = 33.333...% -> 33.33
    expect(calculateProgressPercentage(1, 3)).toBe(33.33);
  });

  it("handles another fractional case (2/3)", () => {
    // 2/3 = 66.666...% -> 66.67
    expect(calculateProgressPercentage(2, 3)).toBe(66.67);
  });

  it("returns exact value for clean division (1/4 = 25)", () => {
    expect(calculateProgressPercentage(1, 4)).toBe(25);
  });

  it("handles 1/7 correctly (14.285714... -> 14.29)", () => {
    expect(calculateProgressPercentage(1, 7)).toBe(14.29);
  });

  it("handles large numbers", () => {
    expect(calculateProgressPercentage(999, 1000)).toBe(99.9);
  });
});

// ============================================================================
// getNextLesson
// ============================================================================

describe("getNextLesson", () => {
  it("returns the next lesson within the same module", () => {
    const modules = buildModules([["m1", ["l1", "l2", "l3"]]]);
    expect(getNextLesson(modules, "l1")).toEqual({
      moduleId: "m1",
      lessonId: "l2",
    });
  });

  it("crosses module boundaries to return the first lesson of the next module", () => {
    const modules = buildModules([
      ["m1", ["l1", "l2"]],
      ["m2", ["l3", "l4"]],
    ]);
    expect(getNextLesson(modules, "l2")).toEqual({
      moduleId: "m2",
      lessonId: "l3",
    });
  });

  it("returns null when current lesson is the very last lesson", () => {
    const modules = buildModules([
      ["m1", ["l1"]],
      ["m2", ["l2"]],
    ]);
    expect(getNextLesson(modules, "l2")).toBeNull();
  });

  it("returns null when current lesson ID is not found", () => {
    const modules = buildModules([["m1", ["l1", "l2"]]]);
    expect(getNextLesson(modules, "nonexistent")).toBeNull();
  });

  it("returns null when modules array is empty", () => {
    expect(getNextLesson([], "l1")).toBeNull();
  });

  it("returns null for a module with no lessons", () => {
    const modules = buildModules([["m1", []]]);
    expect(getNextLesson(modules, "l1")).toBeNull();
  });

  it("handles a single module with a single lesson (returns null)", () => {
    const modules = buildModules([["m1", ["l1"]]]);
    expect(getNextLesson(modules, "l1")).toBeNull();
  });

  it("handles three modules and navigates across all of them", () => {
    const modules = buildModules([
      ["m1", ["l1"]],
      ["m2", ["l2"]],
      ["m3", ["l3"]],
    ]);
    expect(getNextLesson(modules, "l1")).toEqual({
      moduleId: "m2",
      lessonId: "l2",
    });
    expect(getNextLesson(modules, "l2")).toEqual({
      moduleId: "m3",
      lessonId: "l3",
    });
    expect(getNextLesson(modules, "l3")).toBeNull();
  });

  it("skips empty modules when flattening", () => {
    const modules = buildModules([
      ["m1", ["l1"]],
      ["m2", []],
      ["m3", ["l2"]],
    ]);
    expect(getNextLesson(modules, "l1")).toEqual({
      moduleId: "m3",
      lessonId: "l2",
    });
  });
});

// ============================================================================
// getPreviousLesson
// ============================================================================

describe("getPreviousLesson", () => {
  it("returns the previous lesson within the same module", () => {
    const modules = buildModules([["m1", ["l1", "l2", "l3"]]]);
    expect(getPreviousLesson(modules, "l3")).toEqual({
      moduleId: "m1",
      lessonId: "l2",
    });
  });

  it("crosses module boundaries to return the last lesson of the previous module", () => {
    const modules = buildModules([
      ["m1", ["l1", "l2"]],
      ["m2", ["l3", "l4"]],
    ]);
    expect(getPreviousLesson(modules, "l3")).toEqual({
      moduleId: "m1",
      lessonId: "l2",
    });
  });

  it("returns null when current lesson is the very first lesson", () => {
    const modules = buildModules([
      ["m1", ["l1"]],
      ["m2", ["l2"]],
    ]);
    expect(getPreviousLesson(modules, "l1")).toBeNull();
  });

  it("returns null when current lesson ID is not found", () => {
    const modules = buildModules([["m1", ["l1", "l2"]]]);
    expect(getPreviousLesson(modules, "nonexistent")).toBeNull();
  });

  it("returns null when modules array is empty", () => {
    expect(getPreviousLesson([], "l1")).toBeNull();
  });

  it("returns null for a module with no lessons", () => {
    const modules = buildModules([["m1", []]]);
    expect(getPreviousLesson(modules, "l1")).toBeNull();
  });

  it("handles a single module with a single lesson (returns null)", () => {
    const modules = buildModules([["m1", ["l1"]]]);
    expect(getPreviousLesson(modules, "l1")).toBeNull();
  });

  it("handles three modules and navigates backwards across all of them", () => {
    const modules = buildModules([
      ["m1", ["l1"]],
      ["m2", ["l2"]],
      ["m3", ["l3"]],
    ]);
    expect(getPreviousLesson(modules, "l3")).toEqual({
      moduleId: "m2",
      lessonId: "l2",
    });
    expect(getPreviousLesson(modules, "l2")).toEqual({
      moduleId: "m1",
      lessonId: "l1",
    });
    expect(getPreviousLesson(modules, "l1")).toBeNull();
  });

  it("skips empty modules when flattening", () => {
    const modules = buildModules([
      ["m1", ["l1"]],
      ["m2", []],
      ["m3", ["l2"]],
    ]);
    expect(getPreviousLesson(modules, "l2")).toEqual({
      moduleId: "m1",
      lessonId: "l1",
    });
  });
});

// ============================================================================
// formatTimeSpent
// ============================================================================

describe("formatTimeSpent", () => {
  it('returns "0s" for 0 seconds', () => {
    expect(formatTimeSpent(0)).toBe("0s");
  });

  it('returns "0s" for negative seconds', () => {
    expect(formatTimeSpent(-10)).toBe("0s");
    expect(formatTimeSpent(-1)).toBe("0s");
  });

  it('returns "30s" for 30 seconds', () => {
    expect(formatTimeSpent(30)).toBe("30s");
  });

  it('returns "59s" for 59 seconds', () => {
    expect(formatTimeSpent(59)).toBe("59s");
  });

  it('returns "1m" for exactly 60 seconds', () => {
    expect(formatTimeSpent(60)).toBe("1m");
  });

  it('returns "1m" for 90 seconds (minutes only, no seconds remainder shown)', () => {
    expect(formatTimeSpent(90)).toBe("1m");
  });

  it('returns "2m" for 120 seconds', () => {
    expect(formatTimeSpent(120)).toBe("2m");
  });

  it('returns "1h" for exactly 3600 seconds', () => {
    expect(formatTimeSpent(3600)).toBe("1h");
  });

  it('returns "1h 1m" for 3660 seconds', () => {
    expect(formatTimeSpent(3660)).toBe("1h 1m");
  });

  it('returns "2h" for 7200 seconds', () => {
    expect(formatTimeSpent(7200)).toBe("2h");
  });

  it('returns "2h 1m" for 7260 seconds', () => {
    expect(formatTimeSpent(7260)).toBe("2h 1m");
  });

  it('returns "1h 30m" for 5400 seconds', () => {
    expect(formatTimeSpent(5400)).toBe("1h 30m");
  });

  it("does not show seconds when hours are present", () => {
    // 1h 0m 45s -> should be "1h" (no seconds shown when hours are present)
    expect(formatTimeSpent(3645)).toBe("1h");
  });

  it("does not show seconds when minutes are present", () => {
    // 2m 30s -> should be "2m" (no seconds shown when minutes are present)
    expect(formatTimeSpent(150)).toBe("2m");
  });
});

// ============================================================================
// isCourseDone
// ============================================================================

describe("isCourseDone", () => {
  it("returns true when requiredLessonIds is empty", () => {
    expect(isCourseDone([], [])).toBe(true);
  });

  it("returns true when requiredLessonIds is empty even with completed IDs", () => {
    expect(isCourseDone(["l1", "l2"], [])).toBe(true);
  });

  it("returns true when all required lessons are completed", () => {
    expect(isCourseDone(["l1", "l2", "l3"], ["l1", "l2", "l3"])).toBe(true);
  });

  it("returns true when completed includes extra IDs beyond required", () => {
    expect(
      isCourseDone(["l1", "l2", "l3", "l4", "l5"], ["l1", "l2", "l3"])
    ).toBe(true);
  });

  it("returns false when only some required lessons are completed", () => {
    expect(isCourseDone(["l1"], ["l1", "l2", "l3"])).toBe(false);
  });

  it("returns false when no required lessons are completed", () => {
    expect(isCourseDone([], ["l1", "l2"])).toBe(false);
  });

  it("returns false when completed has unrelated IDs but not the required ones", () => {
    expect(isCourseDone(["l4", "l5"], ["l1", "l2"])).toBe(false);
  });

  it("handles a single required lesson that is completed", () => {
    expect(isCourseDone(["l1"], ["l1"])).toBe(true);
  });

  it("handles a single required lesson that is not completed", () => {
    expect(isCourseDone([], ["l1"])).toBe(false);
  });

  it("handles duplicate IDs in completed array", () => {
    expect(isCourseDone(["l1", "l1", "l2"], ["l1", "l2"])).toBe(true);
  });
});
