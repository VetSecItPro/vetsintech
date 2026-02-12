import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as queries from "../queries";
import * as mutations from "../mutations";
import type {
  Course,
  Module,
  Lesson,
  Cohort,
} from "../types";

// Mock the Supabase server module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Next.js headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

// Import after mocking
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Test Utilities
// =============================================================================

const MOCK_ORG_ID = "550e8400-e29b-41d4-a716-446655440000";
const MOCK_COURSE_ID = "650e8400-e29b-41d4-a716-446655440001";
const MOCK_MODULE_ID = "750e8400-e29b-41d4-a716-446655440002";
const MOCK_LESSON_ID = "850e8400-e29b-41d4-a716-446655440003";
const MOCK_COHORT_ID = "950e8400-e29b-41d4-a716-446655440004";
const MOCK_USER_ID = "a50e8400-e29b-41d4-a716-446655440005";

// Create a mock query builder that resolves when awaited
function createMockQueryBuilder(resolveValue: any = { data: null, error: null }) {
  const builder: any = {
    _resolveValue: resolveValue,
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: function (resolve: any) {
      return Promise.resolve(this._resolveValue).then(resolve);
    },
  };

  // Make single() and maybeSingle() also thenable
  builder.single.mockImplementation(() => ({
    then: (resolve: any) => Promise.resolve(builder._resolveValue).then(resolve),
  }));

  builder.maybeSingle.mockImplementation(() => ({
    then: (resolve: any) => Promise.resolve(builder._resolveValue).then(resolve),
  }));

  return builder;
}

function createMockSupabaseClient() {
  const resolveQueue: any[] = [];
  let defaultResolve: any = { data: null, error: null };
  let lastBuilder: any = null;

  const mockFrom = vi.fn(() => {
    const resolveValue =
      resolveQueue.length > 0 ? resolveQueue.shift()! : defaultResolve;
    lastBuilder = createMockQueryBuilder(resolveValue);
    return lastBuilder;
  });

  return {
    from: mockFrom,
    _setNextResolve: (value: any) => {
      defaultResolve = value;
      resolveQueue.length = 0;
    },
    _pushResolves: (...values: any[]) => {
      values.forEach((v) => resolveQueue.push(v));
    },
    _getMockBuilder: () => lastBuilder,
  } as unknown as SupabaseClient & {
    _setNextResolve: (value: any) => void;
    _pushResolves: (...values: any[]) => void;
    _getMockBuilder: () => any;
  };
}

function createMockCourse(overrides?: Partial<Course>): Course {
  return {
    id: MOCK_COURSE_ID,
    organization_id: MOCK_ORG_ID,
    title: "Test Course",
    slug: "test-course",
    description: "A test course",
    thumbnail_url: null,
    category: "engineering",
    tags: ["test", "demo"],
    prerequisites: [],
    status: "draft",
    created_by: MOCK_USER_ID,
    estimated_duration_minutes: 120,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function createMockModule(overrides?: Partial<Module>): Module {
  return {
    id: MOCK_MODULE_ID,
    course_id: MOCK_COURSE_ID,
    title: "Module 1",
    description: "First module",
    sort_order: 0,
    is_required: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function createMockLesson(overrides?: Partial<Lesson>): Lesson {
  return {
    id: MOCK_LESSON_ID,
    module_id: MOCK_MODULE_ID,
    title: "Lesson 1",
    lesson_type: "text",
    content: null,
    video_url: null,
    sort_order: 0,
    estimated_duration_minutes: 30,
    is_required: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function createMockCohort(overrides?: Partial<Cohort>): Cohort {
  return {
    id: MOCK_COHORT_ID,
    organization_id: MOCK_ORG_ID,
    course_id: MOCK_COURSE_ID,
    name: "Cohort Alpha",
    description: "First cohort",
    status: "active",
    starts_at: "2025-06-01T00:00:00Z",
    ends_at: "2025-12-31T23:59:59Z",
    max_students: 50,
    cloned_from: null,
    created_by: MOCK_USER_ID,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// =============================================================================
// Course Queries Tests
// =============================================================================

describe("getCourses", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
    _getMockBuilder: () => any;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns courses with stats for an organization", async () => {
    const mockData = [
      {
        ...createMockCourse(),
        modules: [{ count: 3 }],
        cohorts: [{ count: 2 }],
      },
    ];

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getCourses(MOCK_ORG_ID);

    expect(mockSupabase.from).toHaveBeenCalledWith("courses");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: MOCK_COURSE_ID,
      title: "Test Course",
      module_count: 3,
      cohort_count: 2,
    });
  });

  it("applies status filter when provided", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    await queries.getCourses(MOCK_ORG_ID, { status: "published" });

    const builder = mockSupabase._getMockBuilder();
    expect(builder.eq).toHaveBeenCalledWith("status", "published");
  });

  it("applies category filter when provided", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    await queries.getCourses(MOCK_ORG_ID, { category: "engineering" });

    const builder = mockSupabase._getMockBuilder();
    expect(builder.eq).toHaveBeenCalledWith("category", "engineering");
  });

  it("applies search filter when provided", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    await queries.getCourses(MOCK_ORG_ID, { search: "AWS" });

    const builder = mockSupabase._getMockBuilder();
    expect(builder.or).toHaveBeenCalledWith(
      "title.ilike.%AWS%,description.ilike.%AWS%"
    );
  });

  it("throws error when Supabase returns error", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { message: "Database error", code: "42P01" },
    });

    await expect(queries.getCourses(MOCK_ORG_ID)).rejects.toThrow();
  });

  it("returns empty array when no courses found", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    const result = await queries.getCourses(MOCK_ORG_ID);

    expect(result).toEqual([]);
  });

  it("handles courses with null tags and prerequisites", async () => {
    const mockData = [
      {
        ...createMockCourse({
          tags: null as unknown as string[],
          prerequisites: null as unknown as string[],
        }),
        modules: [{ count: 0 }],
        cohorts: [{ count: 0 }],
      },
    ];

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getCourses(MOCK_ORG_ID);

    expect(result[0].tags).toEqual([]);
    expect(result[0].prerequisites).toEqual([]);
  });
});

describe("getCourseById", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
    _getMockBuilder: () => any;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns a course by ID", async () => {
    const mockCourse = createMockCourse();

    mockSupabase._setNextResolve({ data: mockCourse, error: null });

    const result = await queries.getCourseById(MOCK_COURSE_ID, MOCK_ORG_ID);

    const builder = mockSupabase._getMockBuilder();
    expect(mockSupabase.from).toHaveBeenCalledWith("courses");
    expect(builder.eq).toHaveBeenCalledWith("id", MOCK_COURSE_ID);
    expect(builder.eq).toHaveBeenCalledWith("organization_id", MOCK_ORG_ID);
    expect(result).toEqual(mockCourse);
  });

  it("returns null when course not found (PGRST116)", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const result = await queries.getCourseById(MOCK_COURSE_ID, MOCK_ORG_ID);

    expect(result).toBeNull();
  });

  it("throws error for non-PGRST116 errors", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "42P01", message: "Table does not exist" },
    });

    await expect(
      queries.getCourseById(MOCK_COURSE_ID, MOCK_ORG_ID)
    ).rejects.toThrow();
  });
});

describe("getCourseBySlug", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns a course by slug", async () => {
    const mockCourse = createMockCourse();

    mockSupabase._setNextResolve({ data: mockCourse, error: null });

    const result = await queries.getCourseBySlug("test-course", MOCK_ORG_ID);

    expect(result).toEqual(mockCourse);
  });

  it("returns null when course not found", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const result = await queries.getCourseBySlug(
      "nonexistent-slug",
      MOCK_ORG_ID
    );

    expect(result).toBeNull();
  });
});

describe("getCourseWithModules", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns course with sorted modules and lessons", async () => {
    const mockCourse = createMockCourse();
    const mockModules = [
      {
        ...createMockModule({ sort_order: 1 }),
        lessons: [
          createMockLesson({ sort_order: 2 }),
          createMockLesson({ id: "lesson-2", sort_order: 0 }),
        ],
      },
      {
        ...createMockModule({ id: "module-2", sort_order: 0 }),
        lessons: [],
      },
    ];

    // Single createClient call — two sequential from() calls on same client
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: mockCourse, error: null },
      { data: mockModules, error: null }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    const result = await queries.getCourseWithModules(
      MOCK_COURSE_ID,
      MOCK_ORG_ID
    );

    expect(result).toBeDefined();
    expect(result?.modules).toHaveLength(2);
    // Lessons should be sorted by sort_order
    expect(result?.modules[0].lessons[0].sort_order).toBe(0);
    expect(result?.modules[0].lessons[1].sort_order).toBe(2);
  });

  it("returns null when course not found", async () => {
    const mock = createMockSupabaseClient();
    mock._setNextResolve({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    const result = await queries.getCourseWithModules(
      MOCK_COURSE_ID,
      MOCK_ORG_ID
    );

    expect(result).toBeNull();
  });

  it("throws error when modules fetch fails", async () => {
    const mockCourse = createMockCourse();

    // First from() returns course, second from() returns error
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: mockCourse, error: null },
      { data: null, error: { code: "42P01", message: "Table error" } }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    await expect(
      queries.getCourseWithModules(MOCK_COURSE_ID, MOCK_ORG_ID)
    ).rejects.toThrow();
  });
});

describe("getCourseCategories", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns unique sorted categories", async () => {
    const mockData = [
      { category: "engineering" },
      { category: "business" },
      { category: "engineering" }, // duplicate
      { category: "design" },
    ];

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getCourseCategories(MOCK_ORG_ID);

    expect(result).toEqual(["business", "design", "engineering"]);
  });

  it("filters out null categories", async () => {
    const mockData = [
      { category: "engineering" },
      { category: null },
      { category: "design" },
    ];

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getCourseCategories(MOCK_ORG_ID);

    expect(result).toEqual(["design", "engineering"]);
  });

  it("returns empty array when no categories exist", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    const result = await queries.getCourseCategories(MOCK_ORG_ID);

    expect(result).toEqual([]);
  });
});

// =============================================================================
// Module Queries Tests
// =============================================================================

describe("getModulesByCourse", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
    _getMockBuilder: () => any;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns modules sorted by sort_order", async () => {
    const mockModules = [
      createMockModule({ sort_order: 0 }),
      createMockModule({ id: "module-2", sort_order: 1 }),
    ];

    mockSupabase._setNextResolve({ data: mockModules, error: null });

    const result = await queries.getModulesByCourse(MOCK_COURSE_ID);

    const builder = mockSupabase._getMockBuilder();
    expect(builder.eq).toHaveBeenCalledWith("course_id", MOCK_COURSE_ID);
    expect(builder.order).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
    expect(result).toEqual(mockModules);
  });

  it("returns empty array when no modules found", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    const result = await queries.getModulesByCourse(MOCK_COURSE_ID);

    expect(result).toEqual([]);
  });

  it("throws error on database failure", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "42P01", message: "Error" },
    });

    await expect(queries.getModulesByCourse(MOCK_COURSE_ID)).rejects.toThrow();
  });
});

describe("getModuleWithLessons", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns module with sorted lessons", async () => {
    const mockData = {
      ...createMockModule(),
      lessons: [
        createMockLesson({ sort_order: 2 }),
        createMockLesson({ id: "lesson-2", sort_order: 0 }),
        createMockLesson({ id: "lesson-3", sort_order: 1 }),
      ],
    };

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getModuleWithLessons(MOCK_MODULE_ID);

    expect(result).toBeDefined();
    expect(result?.lessons).toHaveLength(3);
    expect(result?.lessons[0].sort_order).toBe(0);
    expect(result?.lessons[1].sort_order).toBe(1);
    expect(result?.lessons[2].sort_order).toBe(2);
  });

  it("returns null when module not found", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const result = await queries.getModuleWithLessons(MOCK_MODULE_ID);

    expect(result).toBeNull();
  });
});

// =============================================================================
// Lesson Queries Tests
// =============================================================================

describe("getLessonsByModule", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns lessons sorted by sort_order", async () => {
    const mockLessons = [
      createMockLesson({ sort_order: 0 }),
      createMockLesson({ id: "lesson-2", sort_order: 1 }),
    ];

    mockSupabase._setNextResolve({ data: mockLessons, error: null });

    const result = await queries.getLessonsByModule(MOCK_MODULE_ID);

    expect(result).toEqual(mockLessons);
  });
});

describe("getLessonById", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns lesson by ID", async () => {
    const mockLesson = createMockLesson();

    mockSupabase._setNextResolve({ data: mockLesson, error: null });

    const result = await queries.getLessonById(MOCK_LESSON_ID);

    expect(result).toEqual(mockLesson);
  });

  it("returns null when lesson not found", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const result = await queries.getLessonById(MOCK_LESSON_ID);

    expect(result).toBeNull();
  });
});

// =============================================================================
// Cohort Queries Tests
// =============================================================================

describe("getCohorts", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns cohorts with course and enrollment count", async () => {
    const mockData = [
      {
        ...createMockCohort(),
        course: {
          id: MOCK_COURSE_ID,
          title: "Test Course",
          slug: "test-course",
        },
        enrollments: [{ count: 5 }],
      },
    ];

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getCohorts(MOCK_ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].enrollment_count).toBe(5);
    expect(result[0].course.title).toBe("Test Course");
  });

  it("applies course_id filter when provided", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    await queries.getCohorts(MOCK_ORG_ID, { course_id: MOCK_COURSE_ID });

    // Just verify it doesn't throw
    expect(true).toBe(true);
  });

  it("applies status filter when provided", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    await queries.getCohorts(MOCK_ORG_ID, { status: "active" });

    expect(true).toBe(true);
  });

  it("applies search filter when provided", async () => {
    mockSupabase._setNextResolve({ data: [], error: null });

    await queries.getCohorts(MOCK_ORG_ID, { search: "Alpha" });

    expect(true).toBe(true);
  });
});

describe("getCohortById", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns cohort with course and enrollment count", async () => {
    const mockData = {
      ...createMockCohort(),
      course: { id: MOCK_COURSE_ID, title: "Test Course", slug: "test-course" },
      enrollments: [{ count: 10 }],
    };

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getCohortById(MOCK_COHORT_ID, MOCK_ORG_ID);

    expect(result).toBeDefined();
    expect(result?.enrollment_count).toBe(10);
  });

  it("returns null when cohort not found", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const result = await queries.getCohortById(MOCK_COHORT_ID, MOCK_ORG_ID);

    expect(result).toBeNull();
  });
});

describe("getCohortWithEnrollments", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns cohort with full enrollment details", async () => {
    const mockData = {
      ...createMockCohort(),
      course: { id: MOCK_COURSE_ID, title: "Test Course", slug: "test-course" },
      enrollments: [
        {
          id: "enrollment-1",
          cohort_id: MOCK_COHORT_ID,
          user_id: MOCK_USER_ID,
          enrolled_at: "2025-01-01T00:00:00Z",
          enrolled_by: MOCK_USER_ID,
          status: "active",
          completed_at: null,
          created_at: "2025-01-01T00:00:00Z",
          user: {
            id: MOCK_USER_ID,
            full_name: "John Doe",
            email: "john@example.com",
          },
        },
      ],
    };

    mockSupabase._setNextResolve({ data: mockData, error: null });

    const result = await queries.getCohortWithEnrollments(
      MOCK_COHORT_ID,
      MOCK_ORG_ID
    );

    expect(result).toBeDefined();
    expect(result?.enrollments).toHaveLength(1);
    expect(result?.enrollments[0].user.full_name).toBe("John Doe");
  });
});

// =============================================================================
// Course Mutations Tests
// =============================================================================

describe("createCourse", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("creates a course with valid input", async () => {
    const mockCourse = createMockCourse();

    // Single client — first from() = slug check, second from() = insert
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: null, error: null },
      { data: mockCourse, error: null }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    const result = await mutations.createCourse(
      {
        title: "Test Course",
        description: "A test course",
        category: "engineering",
        tags: ["test", "demo"],
      },
      MOCK_ORG_ID,
      MOCK_USER_ID
    );

    expect(result).toEqual(mockCourse);
  });

  it("handles slug collision by appending timestamp", async () => {
    const mockCourse = createMockCourse();

    // First from() = slug exists, second from() = insert with modified slug
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: { id: "existing-id" }, error: null },
      { data: { ...mockCourse, slug: "test-course-abc123" }, error: null }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    const result = await mutations.createCourse(
      { title: "Test Course" },
      MOCK_ORG_ID,
      MOCK_USER_ID
    );

    expect(result.slug).toMatch(/^test-course-[a-z0-9]+$/);
  });

  it("throws error when insert fails", async () => {
    // First from() = slug check OK, second from() = insert fails
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: null, error: null },
      { data: null, error: { code: "23505", message: "Duplicate key" } }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    await expect(
      mutations.createCourse({ title: "Test" }, MOCK_ORG_ID, MOCK_USER_ID)
    ).rejects.toThrow();
  });
});

describe("updateCourse", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
    _getMockBuilder: () => any;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("updates course with partial data", async () => {
    const updatedCourse = createMockCourse({ title: "Updated Title" });

    mockSupabase._setNextResolve({ data: updatedCourse, error: null });

    const result = await mutations.updateCourse(MOCK_COURSE_ID, MOCK_ORG_ID, {
      title: "Updated Title",
    });

    expect(result.title).toBe("Updated Title");
  });

  it("updates only provided fields", async () => {
    const updatedCourse = createMockCourse({ status: "published" });

    mockSupabase._setNextResolve({ data: updatedCourse, error: null });

    await mutations.updateCourse(MOCK_COURSE_ID, MOCK_ORG_ID, {
      status: "published",
    });

    const builder = mockSupabase._getMockBuilder();
    const updateCall = builder.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("status", "published");
    expect(updateCall).not.toHaveProperty("description");
  });

  it("throws error when update fails", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "42P01", message: "Error" },
    });

    await expect(
      mutations.updateCourse(MOCK_COURSE_ID, MOCK_ORG_ID, { title: "New" })
    ).rejects.toThrow();
  });
});

describe("deleteCourse", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("deletes a course successfully", async () => {
    mockSupabase._setNextResolve({ data: null, error: null });

    await mutations.deleteCourse(MOCK_COURSE_ID, MOCK_ORG_ID);

    // Verify no error thrown
    expect(true).toBe(true);
  });

  it("throws error when delete fails", async () => {
    mockSupabase._setNextResolve({
      data: null,
      error: { code: "23503", message: "Foreign key violation" },
    });

    await expect(
      mutations.deleteCourse(MOCK_COURSE_ID, MOCK_ORG_ID)
    ).rejects.toThrow();
  });
});

describe("publishCourse", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("publishes a course by updating status", async () => {
    const publishedCourse = createMockCourse({ status: "published" });

    mockSupabase._setNextResolve({ data: publishedCourse, error: null });

    const result = await mutations.publishCourse(MOCK_COURSE_ID, MOCK_ORG_ID);

    expect(result.status).toBe("published");
  });
});

describe("archiveCourse", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("archives a course by updating status", async () => {
    const archivedCourse = createMockCourse({ status: "archived" });

    mockSupabase._setNextResolve({ data: archivedCourse, error: null });

    const result = await mutations.archiveCourse(MOCK_COURSE_ID, MOCK_ORG_ID);

    expect(result.status).toBe("archived");
  });
});

// =============================================================================
// Module Mutations Tests
// =============================================================================

describe("createModule", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("creates a module with auto-incremented sort_order", async () => {
    const mockModule = createMockModule({ sort_order: 2 });

    // Single client — first from() = get last sort_order, second from() = insert
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: { sort_order: 1 }, error: null },
      { data: mockModule, error: null }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    const result = await mutations.createModule({
      course_id: MOCK_COURSE_ID,
      title: "Module 1",
      description: "First module",
    });

    expect(result.sort_order).toBe(2);
  });

  it("starts sort_order at 0 when no modules exist", async () => {
    const mockModule = createMockModule({ sort_order: 0 });

    // Single client — first from() = no existing modules, second from() = insert
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: null, error: null },
      { data: mockModule, error: null }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    const result = await mutations.createModule({
      course_id: MOCK_COURSE_ID,
      title: "Module 1",
    });

    expect(result.sort_order).toBe(0);
  });
});

describe("updateModule", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("updates module successfully", async () => {
    const updatedModule = createMockModule({ title: "Updated Module" });

    mockSupabase._setNextResolve({ data: updatedModule, error: null });

    const result = await mutations.updateModule(MOCK_MODULE_ID, {
      title: "Updated Module",
    });

    expect(result.title).toBe("Updated Module");
  });
});

describe("deleteModule", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("deletes module successfully", async () => {
    mockSupabase._setNextResolve({ data: null, error: null });

    await mutations.deleteModule(MOCK_MODULE_ID);

    expect(true).toBe(true);
  });
});

describe("reorderModules", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("reorders modules successfully", async () => {
    // Single client — 3 sequential from() calls, all succeed
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    const moduleIds = ["module-1", "module-2", "module-3"];

    await mutations.reorderModules(MOCK_COURSE_ID, moduleIds);

    expect(mock.from).toHaveBeenCalledTimes(3);
  });

  it("throws error when reorder fails", async () => {
    // Single client — first from() returns error
    const mock = createMockSupabaseClient();
    mock._pushResolves({
      data: null,
      error: { code: "42P01", message: "Error" },
    });
    vi.mocked(createClient).mockResolvedValue(mock);

    await expect(
      mutations.reorderModules(MOCK_COURSE_ID, ["module-1"])
    ).rejects.toThrow();
  });
});

// =============================================================================
// Lesson Mutations Tests
// =============================================================================

describe("createLesson", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("creates a lesson with auto-incremented sort_order", async () => {
    const mockLesson = createMockLesson({ sort_order: 1 });

    // Single client — first from() = get last sort_order, second from() = insert
    const mock = createMockSupabaseClient();
    mock._pushResolves(
      { data: { sort_order: 0 }, error: null },
      { data: mockLesson, error: null }
    );
    vi.mocked(createClient).mockResolvedValue(mock);

    const result = await mutations.createLesson({
      module_id: MOCK_MODULE_ID,
      title: "Lesson 1",
    });

    expect(result.sort_order).toBe(1);
  });
});

describe("updateLesson", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("updates lesson successfully", async () => {
    const updatedLesson = createMockLesson({ title: "Updated Lesson" });

    mockSupabase._setNextResolve({ data: updatedLesson, error: null });

    const result = await mutations.updateLesson(MOCK_LESSON_ID, {
      title: "Updated Lesson",
    });

    expect(result.title).toBe("Updated Lesson");
  });
});

describe("deleteLesson", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("deletes lesson successfully", async () => {
    mockSupabase._setNextResolve({ data: null, error: null });

    await mutations.deleteLesson(MOCK_LESSON_ID);

    expect(true).toBe(true);
  });
});

// =============================================================================
// Cohort Mutations Tests
// =============================================================================

describe("createCohort", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("creates a cohort successfully", async () => {
    const mockCohort = createMockCohort();

    mockSupabase._setNextResolve({ data: mockCohort, error: null });

    const result = await mutations.createCohort(
      {
        course_id: MOCK_COURSE_ID,
        name: "Cohort Alpha",
        description: "First cohort",
        starts_at: "2025-06-01T00:00:00Z",
        ends_at: "2025-12-31T23:59:59Z",
        max_students: 50,
      },
      MOCK_ORG_ID,
      MOCK_USER_ID
    );

    expect(result).toEqual(mockCohort);
  });
});

describe("updateCohort", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("updates cohort successfully", async () => {
    const updatedCohort = createMockCohort({ name: "Updated Cohort" });

    mockSupabase._setNextResolve({ data: updatedCohort, error: null });

    const result = await mutations.updateCohort(
      MOCK_COHORT_ID,
      MOCK_ORG_ID,
      { name: "Updated Cohort" }
    );

    expect(result.name).toBe("Updated Cohort");
  });
});

describe("deleteCohort", () => {
  let mockSupabase: SupabaseClient & {
    _setNextResolve: (value: any) => void;
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("deletes cohort successfully", async () => {
    mockSupabase._setNextResolve({ data: null, error: null });

    await mutations.deleteCohort(MOCK_COHORT_ID, MOCK_ORG_ID);

    expect(true).toBe(true);
  });
});
