import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { requireAuth, isAuthError, requireCourseOwnership } from "../api-middleware";
import type { UserRole } from "@/lib/types/auth";

// Mock the server client
vi.mock("../server", () => ({
  createClient: vi.fn(),
}));

// Import after mock is set up
import { createClient } from "../server";

describe("requireAuth middleware", () => {
  let mockSupabase: any;
  let mockRequest: Request;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockRequest = new Request("http://localhost:3000/api/test");

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              // For user_roles double eq
              data: null,
              error: null,
            })),
            single: vi.fn(() => ({
              // For profiles single
              data: null,
              error: null,
            })),
            data: null,
            error: null,
          })),
          single: vi.fn(() => ({
            // For direct single calls
            data: null,
            error: null,
          })),
          data: null,
          error: null,
        })),
      })),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const result = await requireAuth(mockRequest);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
      const json = await (result as NextResponse).json();
      expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 401 when auth.getUser returns error", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Session expired"),
      });

      const result = await requireAuth(mockRequest);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(401);
    });

    it("returns 403 when profile is not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: new Error("Profile not found"),
            })),
          })),
        })),
      });

      const result = await requireAuth(mockRequest);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
      const json = await (result as NextResponse).json();
      expect(json).toEqual({ error: "Profile not found" });
    });

    it("returns 500 when roles fetch fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
        error: null,
      });

      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: null,
              error: new Error("Database error"),
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(500);
      const json = await (result as NextResponse).json();
      expect(json).toEqual({ error: "Failed to fetch roles" });
    });
  });

  describe("authorization with roles", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
          },
        },
        error: null,
      });
    });

    it("allows authenticated user without role restrictions", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [{ role: "student" }],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toEqual({
        user: { id: "user-123", email: "test@example.com" },
        organizationId: "org-123",
        roles: ["student"],
      });
    });

    it("allows admin to access admin-only routes", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [{ role: "admin" }],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest, ["admin"]);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toEqual({
        user: { id: "user-123", email: "test@example.com" },
        organizationId: "org-123",
        roles: ["admin"],
      });
    });

    it("allows instructor to access instructor/admin routes", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [{ role: "instructor" }],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest, ["admin", "instructor"]);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toEqual({
        user: { id: "user-123", email: "test@example.com" },
        organizationId: "org-123",
        roles: ["instructor"],
      });
    });

    it("returns 403 when student tries to access admin route", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [{ role: "student" }],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest, ["admin"]);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
      const json = await (result as NextResponse).json();
      expect(json).toEqual({ error: "Forbidden — insufficient permissions" });
    });

    it("returns 403 when student tries to access instructor route", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [{ role: "student" }],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest, ["admin", "instructor"]);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
      const json = await (result as NextResponse).json();
      expect(json).toEqual({ error: "Forbidden — insufficient permissions" });
    });

    it("handles users with multiple roles", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [{ role: "instructor" }, { role: "student" }],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest, ["instructor"]);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toEqual({
        user: { id: "user-123", email: "test@example.com" },
        organizationId: "org-123",
        roles: ["instructor", "student"],
      });
    });

    it("handles users with no roles", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest);

      expect(result).not.toBeInstanceOf(NextResponse);
      expect(result).toEqual({
        user: { id: "user-123", email: "test@example.com" },
        organizationId: "org-123",
        roles: [],
      });
    });

    it("returns 403 when user has no roles but route requires roles", async () => {
      const mockProfileChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { organization_id: "org-123" },
              error: null,
            })),
          })),
        })),
      };

      const mockRolesChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "profiles") return mockProfileChain;
        if (table === "user_roles") return mockRolesChain;
        return {};
      });

      const result = await requireAuth(mockRequest, ["admin"]);

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(403);
    });
  });
});

describe("isAuthError type guard", () => {
  it("returns true for NextResponse error", () => {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    expect(isAuthError(response)).toBe(true);
  });

  it("returns false for successful auth result", () => {
    const authResult = {
      user: { id: "user-123", email: "test@example.com" },
      organizationId: "org-123",
      roles: ["student"] as UserRole[],
    };
    expect(isAuthError(authResult)).toBe(false);
  });

  it("works correctly in type narrowing", () => {
    const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (isAuthError(response)) {
      // Should be typed as NextResponse
      expect(response.status).toBe(403);
    } else {
      // This branch should not execute
      expect.fail("Should have been an auth error");
    }
  });
});

describe("requireCourseOwnership", () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  it("returns true when user owns the course", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { created_by: "user-123" },
            error: null,
          })),
        })),
      })),
    });

    const result = await requireCourseOwnership("user-123", "course-456");

    expect(result).toBe(true);
  });

  it("returns 404 when course does not exist", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: new Error("Not found"),
          })),
        })),
      })),
    });

    const result = await requireCourseOwnership("user-123", "nonexistent");

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(404);
    const json = await (result as NextResponse).json();
    expect(json).toEqual({ error: "Course not found" });
  });

  it("returns 403 when user does not own the course", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { created_by: "other-user-456" },
            error: null,
          })),
        })),
      })),
    });

    const result = await requireCourseOwnership("user-123", "course-456");

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    const json = await (result as NextResponse).json();
    expect(json).toEqual({
      error: "Forbidden — you can only manage your own courses",
    });
  });

  it("verifies correct table and query structure", async () => {
    const selectFn = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { created_by: "user-123" },
          error: null,
        })),
      })),
    }));

    const eqFn = vi.fn(() => ({
      single: vi.fn(() => ({
        data: { created_by: "user-123" },
        error: null,
      })),
    }));

    mockSupabase.from.mockReturnValue({
      select: selectFn,
    });

    selectFn.mockReturnValue({
      eq: eqFn,
    });

    await requireCourseOwnership("user-123", "course-456");

    expect(mockSupabase.from).toHaveBeenCalledWith("courses");
    expect(selectFn).toHaveBeenCalledWith("created_by");
    expect(eqFn).toHaveBeenCalledWith("id", "course-456");
  });
});

describe("real-world API route scenarios", () => {
  let mockSupabase: any;
  let mockRequest: Request;

  beforeEach(() => {
    mockRequest = new Request("http://localhost:3000/api/test");
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  it("simulates GET /api/courses with authenticated student", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "student-123",
          email: "student@example.com",
        },
      },
      error: null,
    });

    const mockProfileChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { organization_id: "org-123" },
            error: null,
          })),
        })),
      })),
    };

    const mockRolesChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ role: "student" }],
            error: null,
          })),
        })),
      })),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return mockProfileChain;
      if (table === "user_roles") return mockRolesChain;
      return {};
    });

    // GET /api/courses - no role restriction
    const result = await requireAuth(mockRequest);

    expect(result).not.toBeInstanceOf(NextResponse);
    if (!isAuthError(result)) {
      expect(result.user.id).toBe("student-123");
      expect(result.roles).toContain("student");
    }
  });

  it("simulates POST /api/courses with instructor (should succeed)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "instructor-123",
          email: "instructor@example.com",
        },
      },
      error: null,
    });

    const mockProfileChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { organization_id: "org-123" },
            error: null,
          })),
        })),
      })),
    };

    const mockRolesChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ role: "instructor" }],
            error: null,
          })),
        })),
      })),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return mockProfileChain;
      if (table === "user_roles") return mockRolesChain;
      return {};
    });

    // POST /api/courses - requires ["admin", "instructor"]
    const result = await requireAuth(mockRequest, ["admin", "instructor"]);

    expect(result).not.toBeInstanceOf(NextResponse);
    if (!isAuthError(result)) {
      expect(result.user.id).toBe("instructor-123");
      expect(result.roles).toContain("instructor");
    }
  });

  it("simulates POST /api/courses with student (should fail)", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "student-123",
          email: "student@example.com",
        },
      },
      error: null,
    });

    const mockProfileChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { organization_id: "org-123" },
            error: null,
          })),
        })),
      })),
    };

    const mockRolesChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ role: "student" }],
            error: null,
          })),
        })),
      })),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return mockProfileChain;
      if (table === "user_roles") return mockRolesChain;
      return {};
    });

    // POST /api/courses - requires ["admin", "instructor"]
    const result = await requireAuth(mockRequest, ["admin", "instructor"]);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("simulates GET /api/gamification/xp with authenticated user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "user@example.com",
        },
      },
      error: null,
    });

    const mockProfileChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { organization_id: "org-123" },
            error: null,
          })),
        })),
      })),
    };

    const mockRolesChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ role: "student" }],
            error: null,
          })),
        })),
      })),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return mockProfileChain;
      if (table === "user_roles") return mockRolesChain;
      return {};
    });

    // GET /api/gamification/xp - no role restriction
    const result = await requireAuth(mockRequest);

    expect(result).not.toBeInstanceOf(NextResponse);
    if (!isAuthError(result)) {
      expect(result.organizationId).toBe("org-123");
    }
  });
});
