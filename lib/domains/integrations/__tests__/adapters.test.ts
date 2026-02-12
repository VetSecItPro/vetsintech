import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { CourseraAdapter } from "../coursera/adapter";
import { PluralsightAdapter } from "../pluralsight/adapter";
import { UdemyAdapter } from "../udemy/adapter";
import { getAdapter } from "../adapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Response object for mocking fetch */
function mockResponse(
  body: unknown,
  opts: { ok?: boolean; status?: number; statusText?: string } = {}
): Response {
  const { ok = true, status = 200, statusText = "OK" } = opts;
  return {
    ok,
    status,
    statusText,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
    clone: () => mockResponse(body, opts),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

// ---------------------------------------------------------------------------
// getAdapter
// ---------------------------------------------------------------------------

describe("getAdapter", () => {
  it("returns a CourseraAdapter for 'coursera'", () => {
    const adapter = getAdapter("coursera");
    expect(adapter).toBeDefined();
    expect(adapter.platform).toBe("coursera");
  });

  it("returns a PluralsightAdapter for 'pluralsight'", () => {
    const adapter = getAdapter("pluralsight");
    expect(adapter).toBeDefined();
    expect(adapter.platform).toBe("pluralsight");
  });

  it("returns a UdemyAdapter for 'udemy'", () => {
    const adapter = getAdapter("udemy");
    expect(adapter).toBeDefined();
    expect(adapter.platform).toBe("udemy");
  });

  it("throws for an unsupported platform", () => {
    // @ts-expect-error -- intentionally passing invalid platform
    expect(() => getAdapter("skillshare")).toThrow("Unsupported platform: skillshare");
  });

  it("returns distinct adapter instances for different platforms", () => {
    const a = getAdapter("coursera");
    const b = getAdapter("pluralsight");
    expect(a).not.toBe(b);
  });

  it("returns the same adapter instance for repeated calls", () => {
    const a = getAdapter("coursera");
    const b = getAdapter("coursera");
    expect(a).toBe(b);
  });
});

// ===========================================================================
// CourseraAdapter
// ===========================================================================

describe("CourseraAdapter", () => {
  let adapter: CourseraAdapter;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const validCredentials = {
    client_id: "test-client-id",
    client_secret: "test-client-secret",
    org_slug: "test-org",
  };

  beforeEach(() => {
    adapter = new CourseraAdapter();
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // platform property
  // -------------------------------------------------------------------------

  it("has platform set to 'coursera'", () => {
    expect(adapter.platform).toBe("coursera");
  });

  // -------------------------------------------------------------------------
  // validateCredentials
  // -------------------------------------------------------------------------

  describe("validateCredentials", () => {
    it("returns false when credentials are empty", async () => {
      const result = await adapter.validateCredentials({});
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns false when client_id is missing", async () => {
      const result = await adapter.validateCredentials({
        client_secret: "secret",
        org_slug: "org",
      });
      expect(result).toBe(false);
    });

    it("returns false when client_secret is missing", async () => {
      const result = await adapter.validateCredentials({
        client_id: "id",
        org_slug: "org",
      });
      expect(result).toBe(false);
    });

    it("returns false when org_slug is missing", async () => {
      const result = await adapter.validateCredentials({
        client_id: "id",
        client_secret: "secret",
      });
      expect(result).toBe(false);
    });

    it("returns true when token exchange succeeds", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("returns false when token exchange returns non-ok", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse("Unauthorized", { ok: false, status: 401 })
      );
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(false);
    });

    it("returns false when fetch throws a network error", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(false);
    });

    it("sends correct body params in token exchange", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );
      await adapter.validateCredentials(validCredentials);

      const call = fetchSpy.mock.calls[0];
      expect(call[0]).toContain("oauth2/client_credentials/token");
      expect(call[1]?.method).toBe("POST");
      const body = call[1]?.body as string;
      expect(body).toContain("client_id=test-client-id");
      expect(body).toContain("client_secret=test-client-secret");
      expect(body).toContain("grant_type=client_credentials");
    });
  });

  // -------------------------------------------------------------------------
  // fetchEnrollments
  // -------------------------------------------------------------------------

  describe("fetchEnrollments", () => {
    it("returns empty array stub when credentials are missing", async () => {
      const result = await adapter.fetchEnrollments({}, ["user@example.com"]);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches programs then enrollments and filters by email", async () => {
      // 1. Token exchange
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );

      // 2. Programs list
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [{ id: "prog1", name: "Program 1", slug: "prog1" }],
          paging: {},
        })
      );

      // 3. Enrollments for prog1
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              userId: "u1",
              externalId: "ext1",
              fullName: "Test User",
              email: "user@example.com",
              courseId: "c1",
              courseName: "Course 1",
              enrolledTimestamp: "2024-01-15T00:00:00Z",
            },
            {
              userId: "u2",
              externalId: "ext2",
              fullName: "Other User",
              email: "other@example.com",
              courseId: "c2",
              courseName: "Course 2",
              enrolledTimestamp: null,
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseId: "c1",
        courseTitle: "Course 1",
        userEmail: "user@example.com",
        enrolledAt: "2024-01-15T00:00:00Z",
      });
    });

    it("returns empty stub array on API failure during token exchange", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network down"));
      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toEqual([]);
    });

    it("handles case-insensitive email matching", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ elements: [{ id: "p1", name: "P1", slug: "p1" }], paging: {} })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              userId: "u1",
              externalId: "ext1",
              fullName: "User",
              email: "USER@EXAMPLE.COM",
              courseId: "c1",
              courseName: "Course",
              enrolledTimestamp: null,
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].userEmail).toBe("user@example.com");
    });

    it("continues fetching other programs when one program fails", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );

      // Two programs
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            { id: "p1", name: "P1", slug: "p1" },
            { id: "p2", name: "P2", slug: "p2" },
          ],
          paging: {},
        })
      );

      // First program enrollments fail
      fetchSpy.mockResolvedValueOnce(
        mockResponse("Server Error", { ok: false, status: 500 })
      );

      // Second program enrollments succeed
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              userId: "u1",
              externalId: "ext1",
              fullName: "User",
              email: "user@example.com",
              courseId: "c2",
              courseName: "Course 2",
              enrolledTimestamp: null,
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe("c2");
    });
  });

  // -------------------------------------------------------------------------
  // fetchProgress
  // -------------------------------------------------------------------------

  describe("fetchProgress", () => {
    it("returns empty stub array when credentials are missing", async () => {
      const result = await adapter.fetchProgress({}, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns empty array when enrollments list is empty", async () => {
      const result = await adapter.fetchProgress(validCredentials, []);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches learner activity and maps progress correctly", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );

      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              courseId: "c1",
              email: "user@example.com",
              overallProgress: 0.75,
              completionStatus: "IN_PROGRESS",
              completedTimestamp: null,
              totalLearningHours: 2.5,
              lastActivityTimestamp: "2024-06-01T10:00:00Z",
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseId: "c1",
        userEmail: "user@example.com",
        progressPercentage: 75,
        status: "in_progress",
        completedAt: null,
        timeSpentMinutes: 150,
        lastActivityAt: "2024-06-01T10:00:00Z",
      });
    });

    it("marks 100% progress as completed", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );

      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              courseId: "c1",
              email: "user@example.com",
              overallProgress: 1.0,
              completionStatus: "COMPLETED",
              completedTimestamp: "2024-07-01T12:00:00Z",
              totalLearningHours: 10,
              lastActivityTimestamp: "2024-07-01T12:00:00Z",
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);

      expect(result[0].status).toBe("completed");
      expect(result[0].progressPercentage).toBe(100);
      expect(result[0].completedAt).toBe("2024-07-01T12:00:00Z");
    });

    it("caps progress at 100 even when overallProgress exceeds 1.0", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              courseId: "c1",
              email: "user@example.com",
              overallProgress: 1.05,
              completionStatus: "COMPLETED",
              completedTimestamp: "2024-07-01T00:00:00Z",
              totalLearningHours: null,
              lastActivityTimestamp: null,
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result[0].progressPercentage).toBe(100);
    });

    it("filters activities to only matching enrollments", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              courseId: "c1",
              email: "user@example.com",
              overallProgress: 0.5,
              completionStatus: "IN_PROGRESS",
              completedTimestamp: null,
              totalLearningHours: null,
              lastActivityTimestamp: null,
            },
            {
              courseId: "c99",
              email: "other@example.com",
              overallProgress: 0.9,
              completionStatus: "IN_PROGRESS",
              completedTimestamp: null,
              totalLearningHours: null,
              lastActivityTimestamp: null,
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe("c1");
    });

    it("returns empty stub array on API failure", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));
      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result).toEqual([]);
    });

    it("converts totalLearningHours to minutes", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              courseId: "c1",
              email: "user@example.com",
              overallProgress: 0.3,
              completionStatus: "IN_PROGRESS",
              completedTimestamp: null,
              totalLearningHours: 1.5,
              lastActivityTimestamp: null,
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result[0].timeSpentMinutes).toBe(90);
    });

    it("returns null timeSpentMinutes when totalLearningHours is null", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ access_token: "tok", token_type: "bearer", expires_in: 3600 })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          elements: [
            {
              courseId: "c1",
              email: "user@example.com",
              overallProgress: 0.1,
              completionStatus: "IN_PROGRESS",
              completedTimestamp: null,
              totalLearningHours: null,
              lastActivityTimestamp: null,
            },
          ],
          paging: {},
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result[0].timeSpentMinutes).toBeNull();
    });
  });
});

// ===========================================================================
// PluralsightAdapter
// ===========================================================================

describe("PluralsightAdapter", () => {
  let adapter: PluralsightAdapter;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const validCredentials = {
    api_token: "ps-test-token",
    plan_id: "plan-123",
  };

  beforeEach(() => {
    adapter = new PluralsightAdapter();
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // platform property
  // -------------------------------------------------------------------------

  it("has platform set to 'pluralsight'", () => {
    expect(adapter.platform).toBe("pluralsight");
  });

  // -------------------------------------------------------------------------
  // validateCredentials
  // -------------------------------------------------------------------------

  describe("validateCredentials", () => {
    it("returns false when credentials are empty", async () => {
      const result = await adapter.validateCredentials({});
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns false when api_token is missing", async () => {
      const result = await adapter.validateCredentials({ plan_id: "plan-1" });
      expect(result).toBe(false);
    });

    it("returns false when plan_id is missing", async () => {
      const result = await adapter.validateCredentials({ api_token: "tok" });
      expect(result).toBe(false);
    });

    it("returns true when plan endpoint returns ok", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ id: "plan-123" }));
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(true);
    });

    it("calls the correct plan validation URL", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({}));
      await adapter.validateCredentials(validCredentials);

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe("https://api.pluralsight.com/api/v1/plans/plan-123");
    });

    it("sends Bearer token in Authorization header", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({}));
      await adapter.validateCredentials(validCredentials);

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer ps-test-token");
    });

    it("returns false when plan endpoint returns 401", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse("Unauthorized", { ok: false, status: 401 })
      );
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(false);
    });

    it("returns false when fetch throws a network error", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("DNS resolution failed"));
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fetchEnrollments
  // -------------------------------------------------------------------------

  describe("fetchEnrollments", () => {
    it("returns empty stub array when credentials are missing", async () => {
      const result = await adapter.fetchEnrollments({}, ["a@b.com"]);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches users then course-usage and maps enrollments", async () => {
      // Users list
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "user@example.com", firstName: "Test", lastName: "User" },
            { id: "u2", email: "other@example.com", firstName: "Other", lastName: "User" },
          ],
          pagination: { totalItems: 2, currentPage: 1, totalPages: 1 },
        })
      );

      // Course usage for u1
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              contentId: "course-1",
              contentTitle: "TypeScript Basics",
              startedDate: "2024-03-01",
              completedDate: null,
              percentComplete: 50,
              totalMinutesViewed: 120,
              lastViewedDate: "2024-03-15",
            },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseId: "course-1",
        courseTitle: "TypeScript Basics",
        userEmail: "user@example.com",
        enrolledAt: "2024-03-01",
      });
    });

    it("returns empty stub on API failure", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Timeout"));
      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toEqual([]);
    });

    it("handles case-insensitive email matching", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "USER@EXAMPLE.COM", firstName: "Test", lastName: "User" },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              contentId: "c1",
              contentTitle: "Course",
              startedDate: null,
              completedDate: null,
              percentComplete: 0,
              totalMinutesViewed: 0,
              lastViewedDate: null,
            },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].userEmail).toBe("user@example.com");
    });

    it("skips users not in the orgUserEmails list", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "unmatched@example.com", firstName: "No", lastName: "Match" },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "wanted@example.com",
      ]);
      expect(result).toEqual([]);
      // Should have fetched users but NOT course-usage
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // fetchProgress
  // -------------------------------------------------------------------------

  describe("fetchProgress", () => {
    it("returns empty stub array when credentials are missing", async () => {
      const result = await adapter.fetchProgress({}, [
        { courseId: "c1", userEmail: "u@e.com" },
      ]);
      expect(result).toEqual([]);
    });

    it("returns empty array when enrollments list is empty", async () => {
      const result = await adapter.fetchProgress(validCredentials, []);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches users then course-usage and maps progress", async () => {
      // Users
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "user@example.com", firstName: "Test", lastName: "User" },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      // Course usage
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              contentId: "c1",
              contentTitle: "Course 1",
              startedDate: "2024-01-01",
              completedDate: null,
              percentComplete: 60,
              totalMinutesViewed: 90,
              lastViewedDate: "2024-06-01",
            },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseId: "c1",
        userEmail: "user@example.com",
        progressPercentage: 60,
        status: "in_progress",
        completedAt: null,
        timeSpentMinutes: 90,
        lastActivityAt: "2024-06-01",
      });
    });

    it("marks course as completed when percentComplete is 100", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "user@example.com", firstName: "T", lastName: "U" },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              contentId: "c1",
              contentTitle: "Course",
              startedDate: "2024-01-01",
              completedDate: "2024-02-01",
              percentComplete: 100,
              totalMinutesViewed: 200,
              lastViewedDate: "2024-02-01",
            },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);

      expect(result[0].status).toBe("completed");
      expect(result[0].progressPercentage).toBe(100);
      expect(result[0].completedAt).toBe("2024-02-01");
    });

    it("marks course as completed when completedDate is present even if percent < 100", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "user@example.com", firstName: "T", lastName: "U" },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              contentId: "c1",
              contentTitle: "Course",
              startedDate: "2024-01-01",
              completedDate: "2024-02-15",
              percentComplete: 95,
              totalMinutesViewed: 180,
              lastViewedDate: "2024-02-15",
            },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result[0].status).toBe("completed");
    });

    it("returns empty stub on API failure", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Connection refused"));
      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result).toEqual([]);
    });

    it("only includes progress for enrolled courses", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "user@example.com", firstName: "T", lastName: "U" },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              contentId: "c1",
              contentTitle: "Enrolled Course",
              startedDate: "2024-01-01",
              completedDate: null,
              percentComplete: 40,
              totalMinutesViewed: 50,
              lastViewedDate: "2024-05-01",
            },
            {
              contentId: "c-not-enrolled",
              contentTitle: "Not Enrolled",
              startedDate: "2024-01-01",
              completedDate: null,
              percentComplete: 80,
              totalMinutesViewed: 200,
              lastViewedDate: "2024-06-01",
            },
          ],
          pagination: { totalItems: 2, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe("c1");
    });

    it("caps progress at 100", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            { id: "u1", email: "user@example.com", firstName: "T", lastName: "U" },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              contentId: "c1",
              contentTitle: "Course",
              startedDate: "2024-01-01",
              completedDate: "2024-02-01",
              percentComplete: 110,
              totalMinutesViewed: 300,
              lastViewedDate: "2024-02-01",
            },
          ],
          pagination: { totalItems: 1, currentPage: 1, totalPages: 1 },
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "c1", userEmail: "user@example.com" },
      ]);
      expect(result[0].progressPercentage).toBe(100);
    });
  });
});

// ===========================================================================
// UdemyAdapter
// ===========================================================================

describe("UdemyAdapter", () => {
  let adapter: UdemyAdapter;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const validCredentials = {
    api_key: "udemy-api-key",
    account_id: "mycompany",
  };

  const basicAuthCredentials = {
    api_key: "client_id:client_secret",
    account_id: "mycompany",
  };

  beforeEach(() => {
    adapter = new UdemyAdapter();
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // platform property
  // -------------------------------------------------------------------------

  it("has platform set to 'udemy'", () => {
    expect(adapter.platform).toBe("udemy");
  });

  // -------------------------------------------------------------------------
  // validateCredentials
  // -------------------------------------------------------------------------

  describe("validateCredentials", () => {
    it("returns false when credentials are empty", async () => {
      const result = await adapter.validateCredentials({});
      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns false when api_key is missing", async () => {
      const result = await adapter.validateCredentials({ account_id: "acct" });
      expect(result).toBe(false);
    });

    it("returns false when account_id is missing", async () => {
      const result = await adapter.validateCredentials({ api_key: "key" });
      expect(result).toBe(false);
    });

    it("returns true when users/list endpoint returns ok", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({ count: 1, next: null, previous: null, results: [] })
      );
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(true);
    });

    it("constructs the correct validation URL with account_id", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ count: 0, results: [] }));
      await adapter.validateCredentials(validCredentials);

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toBe(
        "https://mycompany.udemy.com/api-2.0/organizations/mycompany/users/list/?page=1&page_size=1"
      );
    });

    it("uses Bearer auth when api_key does not contain colon", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ count: 0, results: [] }));
      await adapter.validateCredentials(validCredentials);

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer udemy-api-key");
    });

    it("uses Basic auth when api_key contains a colon", async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse({ count: 0, results: [] }));
      await adapter.validateCredentials(basicAuthCredentials);

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
      const expectedEncoded = Buffer.from("client_id:client_secret").toString("base64");
      expect(headers.Authorization).toBe(`Basic ${expectedEncoded}`);
    });

    it("returns false when users/list endpoint returns 403", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse("Forbidden", { ok: false, status: 403 })
      );
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(false);
    });

    it("returns false when fetch throws a network error", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const result = await adapter.validateCredentials(validCredentials);
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fetchEnrollments
  // -------------------------------------------------------------------------

  describe("fetchEnrollments", () => {
    it("returns empty stub array when credentials are missing", async () => {
      const result = await adapter.fetchEnrollments({}, ["u@e.com"]);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches activity data and maps enrollments for matching emails", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React Fundamentals",
              completion_ratio: 0.4,
              num_video_consumed_minutes: 60,
              last_accessed_date: "2024-04-01",
              completion_date: null,
            },
            {
              user_email: "other@example.com",
              course_id: 102,
              course_title: "Node.js",
              completion_ratio: 0.8,
              num_video_consumed_minutes: 120,
              last_accessed_date: "2024-04-10",
              completion_date: null,
            },
          ],
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseId: "101",
        courseTitle: "React Fundamentals",
        userEmail: "user@example.com",
        enrolledAt: null,
      });
    });

    it("deduplicates enrollments by email:course_id", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React",
              completion_ratio: 0.3,
              num_video_consumed_minutes: 30,
              last_accessed_date: "2024-01-01",
              completion_date: null,
            },
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React",
              completion_ratio: 0.5,
              num_video_consumed_minutes: 60,
              last_accessed_date: "2024-02-01",
              completion_date: null,
            },
          ],
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toHaveLength(1);
    });

    it("falls back to user-by-user enrollment fetch when analytics returns empty for matching users", async () => {
      // Analytics endpoint returns results but none match
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 0,
          next: null,
          previous: null,
          results: [],
        })
      );

      // Fallback: users/list
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            { id: 1, email: "user@example.com", name: "Test", surname: "User", is_active: true },
          ],
        })
      );

      // Fallback: user enrollments
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              course_id: 201,
              course_title: "AWS Basics",
              enrollment_date: "2024-05-01",
            },
          ],
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseId: "201",
        courseTitle: "AWS Basics",
        userEmail: "user@example.com",
        enrolledAt: "2024-05-01",
      });
    });

    it("returns empty stub on API failure", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Timeout"));
      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toEqual([]);
    });

    it("handles case-insensitive email matching", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user_email: "USER@EXAMPLE.COM",
              course_id: 301,
              course_title: "Docker",
              completion_ratio: 0,
              num_video_consumed_minutes: 0,
              last_accessed_date: null,
              completion_date: null,
            },
          ],
        })
      );

      const result = await adapter.fetchEnrollments(validCredentials, [
        "user@example.com",
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].userEmail).toBe("user@example.com");
    });
  });

  // -------------------------------------------------------------------------
  // fetchProgress
  // -------------------------------------------------------------------------

  describe("fetchProgress", () => {
    it("returns empty stub array when credentials are missing", async () => {
      const result = await adapter.fetchProgress({}, [
        { courseId: "1", userEmail: "u@e.com" },
      ]);
      expect(result).toEqual([]);
    });

    it("returns empty array when enrollments list is empty", async () => {
      const result = await adapter.fetchProgress(validCredentials, []);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches activity data and maps progress for enrolled courses", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React",
              completion_ratio: 0.65,
              num_video_consumed_minutes: 90,
              last_accessed_date: "2024-06-15",
              completion_date: null,
            },
          ],
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "101", userEmail: "user@example.com" },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseId: "101",
        userEmail: "user@example.com",
        progressPercentage: 65,
        status: "in_progress",
        completedAt: null,
        timeSpentMinutes: 90,
        lastActivityAt: "2024-06-15",
      });
    });

    it("marks as completed when completion_ratio >= 1.0", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React",
              completion_ratio: 1.0,
              num_video_consumed_minutes: 300,
              last_accessed_date: "2024-07-01",
              completion_date: "2024-07-01",
            },
          ],
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "101", userEmail: "user@example.com" },
      ]);

      expect(result[0].status).toBe("completed");
      expect(result[0].progressPercentage).toBe(100);
    });

    it("marks as completed when completion_date exists even with ratio < 1.0", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React",
              completion_ratio: 0.95,
              num_video_consumed_minutes: 280,
              last_accessed_date: "2024-07-01",
              completion_date: "2024-07-01",
            },
          ],
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "101", userEmail: "user@example.com" },
      ]);
      expect(result[0].status).toBe("completed");
    });

    it("caps progress at 100 even when ratio exceeds 1.0", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React",
              completion_ratio: 1.1,
              num_video_consumed_minutes: 350,
              last_accessed_date: "2024-07-01",
              completion_date: "2024-07-01",
            },
          ],
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "101", userEmail: "user@example.com" },
      ]);
      expect(result[0].progressPercentage).toBe(100);
    });

    it("filters to only enrolled course/email pairs", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "Enrolled",
              completion_ratio: 0.5,
              num_video_consumed_minutes: 60,
              last_accessed_date: "2024-05-01",
              completion_date: null,
            },
            {
              user_email: "user@example.com",
              course_id: 999,
              course_title: "Not Enrolled",
              completion_ratio: 0.9,
              num_video_consumed_minutes: 200,
              last_accessed_date: "2024-06-01",
              completion_date: null,
            },
          ],
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "101", userEmail: "user@example.com" },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe("101");
    });

    it("returns empty stub on API failure", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Service unavailable"));
      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "101", userEmail: "user@example.com" },
      ]);
      expect(result).toEqual([]);
    });

    it("handles null num_video_consumed_minutes", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 101,
              course_title: "React",
              completion_ratio: 0.2,
              num_video_consumed_minutes: null,
              last_accessed_date: null,
              completion_date: null,
            },
          ],
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "101", userEmail: "user@example.com" },
      ]);
      expect(result[0].timeSpentMinutes).toBeNull();
      expect(result[0].lastActivityAt).toBeNull();
    });

    it("converts course_id number to string in results", async () => {
      fetchSpy.mockResolvedValueOnce(
        mockResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              user_email: "user@example.com",
              course_id: 12345,
              course_title: "Course",
              completion_ratio: 0.1,
              num_video_consumed_minutes: 10,
              last_accessed_date: "2024-01-01",
              completion_date: null,
            },
          ],
        })
      );

      const result = await adapter.fetchProgress(validCredentials, [
        { courseId: "12345", userEmail: "user@example.com" },
      ]);
      expect(result[0].courseId).toBe("12345");
      expect(typeof result[0].courseId).toBe("string");
    });
  });
});

// ===========================================================================
// Cross-adapter consistency
// ===========================================================================

describe("Cross-adapter consistency", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("all adapters return empty arrays for fetchEnrollments with empty credentials", async () => {
    const platforms = ["coursera", "pluralsight", "udemy"] as const;
    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      const result = await adapter.fetchEnrollments({}, ["test@test.com"]);
      expect(result).toEqual([]);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("all adapters return empty arrays for fetchProgress with empty credentials", async () => {
    const platforms = ["coursera", "pluralsight", "udemy"] as const;
    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      const result = await adapter.fetchProgress({}, [
        { courseId: "c1", userEmail: "test@test.com" },
      ]);
      expect(result).toEqual([]);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("all adapters return false for validateCredentials with empty credentials", async () => {
    const platforms = ["coursera", "pluralsight", "udemy"] as const;
    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      const result = await adapter.validateCredentials({});
      expect(result).toBe(false);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("all adapters return empty array for fetchProgress with empty enrollments array", async () => {
    const platforms = ["coursera", "pluralsight", "udemy"] as const;
    const credentials: Record<string, Record<string, string>> = {
      coursera: { client_id: "id", client_secret: "secret", org_slug: "org" },
      pluralsight: { api_token: "tok", plan_id: "plan" },
      udemy: { api_key: "key", account_id: "acct" },
    };

    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      const result = await adapter.fetchProgress(credentials[platform], []);
      expect(result).toEqual([]);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("all adapters have a valid platform property matching ExternalPlatform", () => {
    const platforms = ["coursera", "pluralsight", "udemy"] as const;
    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      expect(adapter.platform).toBe(platform);
    }
  });
});
