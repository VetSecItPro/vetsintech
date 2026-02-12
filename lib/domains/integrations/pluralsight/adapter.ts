import type { PlatformAdapter, ExternalPlatform } from "../types";

// ---------------------------------------------------------------------------
// Pluralsight API response types
// ---------------------------------------------------------------------------

interface PluralsightUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface PluralsightCourseUsage {
  contentId: string;
  contentTitle: string;
  startedDate: string | null;
  completedDate: string | null;
  percentComplete: number;
  totalMinutesViewed: number;
  lastViewedDate: string | null;
}

interface PluralsightChannel {
  id: string;
  name: string;
  description: string | null;
}

interface PluralsightSkillAssessment {
  id: string;
  skillName: string;
  level: string;
  score: number;
  assessedDate: string;
}

interface PluralsightPaginatedResponse<T> {
  data: T[];
  pagination?: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Stub data (used when API credentials are not configured)
// ---------------------------------------------------------------------------

const STUB_ENROLLMENTS: {
  courseId: string;
  courseTitle: string;
  userEmail: string;
  enrolledAt: string | null;
}[] = [];

const STUB_PROGRESS: {
  courseId: string;
  userEmail: string;
  progressPercentage: number;
  status: string;
  completedAt: string | null;
  timeSpentMinutes: number | null;
  lastActivityAt: string | null;
}[] = [];

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Pluralsight Skills API Adapter
 *
 * Authentication: API token (X-PS-Auth header) or Bearer token.
 * Required credentials:
 *   - api_token: Pluralsight API bearer token
 *   - plan_id: Pluralsight plan/team ID
 *
 * API Base URL: https://api.pluralsight.com
 *
 * Falls back to empty stub data when credentials are not configured.
 */
export class PluralsightAdapter implements PlatformAdapter {
  platform: ExternalPlatform = "pluralsight";

  private readonly API_BASE = "https://api.pluralsight.com";

  /** Minimum ms to wait between paginated API requests (rate-limit safety). */
  private readonly REQUEST_DELAY_MS = 250;

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private hasCredentials(credentials: Record<string, string>): boolean {
    const { api_token, plan_id } = credentials;
    return Boolean(api_token && plan_id);
  }

  private getAuthHeaders(credentials: Record<string, string>): HeadersInit {
    return {
      Authorization: `Bearer ${credentials.api_token}`,
      Accept: "application/json",
    };
  }

  /**
   * Authenticated GET request to the Pluralsight REST API.
   */
  private async apiGet<T>(
    credentials: Record<string, string>,
    path: string,
    params?: Record<string, string>
  ): Promise<PluralsightPaginatedResponse<T>> {
    const url = new URL(`${this.API_BASE}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      headers: this.getAuthHeaders(credentials),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pluralsight API error (${res.status}): ${text}`);
    }

    return (await res.json()) as PluralsightPaginatedResponse<T>;
  }

  /**
   * Fetch all pages from a paginated Pluralsight endpoint.
   */
  private async fetchAllPages<T>(
    credentials: Record<string, string>,
    path: string,
    params?: Record<string, string>
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const pageParams = {
        ...params,
        page: String(page),
        pageSize: String(pageSize),
      };

      const result = await this.apiGet<T>(credentials, path, pageParams);
      allItems.push(...result.data);

      const totalPages = result.pagination?.totalPages ?? 1;
      if (page >= totalPages || result.data.length < pageSize) {
        break;
      }

      page++;
      await this.delay(this.REQUEST_DELAY_MS);
    }

    return allItems;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // -----------------------------------------------------------------------
  // Public PlatformAdapter interface
  // -----------------------------------------------------------------------

  async validateCredentials(
    credentials: Record<string, string>
  ): Promise<boolean> {
    if (!this.hasCredentials(credentials)) {
      return false;
    }

    try {
      const planId = credentials.plan_id;
      const res = await fetch(
        `${this.API_BASE}/api/v1/plans/${planId}`,
        { headers: this.getAuthHeaders(credentials) }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchEnrollments(
    credentials: Record<string, string>,
    orgUserEmails: string[]
  ): Promise<
    {
      courseId: string;
      courseTitle: string;
      userEmail: string;
      enrolledAt: string | null;
    }[]
  > {
    if (!this.hasCredentials(credentials)) {
      return [...STUB_ENROLLMENTS];
    }

    try {
      const planId = credentials.plan_id;
      const emailSet = new Set(orgUserEmails.map((e) => e.toLowerCase()));

      // 1. Fetch all team members
      const users = await this.fetchAllPages<PluralsightUser>(
        credentials,
        `/api/v1/plans/${planId}/users`
      );

      // 2. For each matching user, fetch course usage
      const enrollments: {
        courseId: string;
        courseTitle: string;
        userEmail: string;
        enrolledAt: string | null;
      }[] = [];

      for (const user of users) {
        const email = user.email?.toLowerCase();
        if (!email || !emailSet.has(email)) continue;

        try {
          const courseUsage = await this.fetchAllPages<PluralsightCourseUsage>(
            credentials,
            `/api/v1/plans/${planId}/users/${user.id}/course-usage`
          );

          for (const usage of courseUsage) {
            enrollments.push({
              courseId: usage.contentId,
              courseTitle: usage.contentTitle,
              userEmail: email,
              enrolledAt: usage.startedDate ?? null,
            });
          }
        } catch (err) {
          console.error(
            `Pluralsight: failed to fetch course usage for user ${user.id}:`,
            err
          );
        }

        await this.delay(this.REQUEST_DELAY_MS);
      }

      return enrollments;
    } catch (err) {
      console.error(
        "Pluralsight fetchEnrollments failed, returning stubs:",
        err
      );
      return [...STUB_ENROLLMENTS];
    }
  }

  async fetchProgress(
    credentials: Record<string, string>,
    enrollments: { courseId: string; userEmail: string }[]
  ): Promise<
    {
      courseId: string;
      userEmail: string;
      progressPercentage: number;
      status: string;
      completedAt: string | null;
      timeSpentMinutes: number | null;
      lastActivityAt: string | null;
    }[]
  > {
    if (!this.hasCredentials(credentials)) {
      return [...STUB_PROGRESS];
    }

    if (enrollments.length === 0) {
      return [];
    }

    try {
      const planId = credentials.plan_id;

      // Build email-to-enrollment lookup
      const enrollmentsByEmail = new Map<
        string,
        Set<string>
      >();
      for (const e of enrollments) {
        const email = e.userEmail.toLowerCase();
        if (!enrollmentsByEmail.has(email)) {
          enrollmentsByEmail.set(email, new Set());
        }
        enrollmentsByEmail.get(email)!.add(e.courseId);
      }

      // Fetch users to get user IDs
      const users = await this.fetchAllPages<PluralsightUser>(
        credentials,
        `/api/v1/plans/${planId}/users`
      );

      const progressResults: {
        courseId: string;
        userEmail: string;
        progressPercentage: number;
        status: string;
        completedAt: string | null;
        timeSpentMinutes: number | null;
        lastActivityAt: string | null;
      }[] = [];

      for (const user of users) {
        const email = user.email?.toLowerCase();
        if (!email || !enrollmentsByEmail.has(email)) continue;

        const enrolledCourseIds = enrollmentsByEmail.get(email)!;

        try {
          const courseUsage = await this.fetchAllPages<PluralsightCourseUsage>(
            credentials,
            `/api/v1/plans/${planId}/users/${user.id}/course-usage`
          );

          for (const usage of courseUsage) {
            if (!enrolledCourseIds.has(usage.contentId)) continue;

            const progressPct = Math.round(usage.percentComplete ?? 0);
            const isCompleted = progressPct >= 100 || Boolean(usage.completedDate);

            progressResults.push({
              courseId: usage.contentId,
              userEmail: email,
              progressPercentage: Math.min(progressPct, 100),
              status: isCompleted ? "completed" : "in_progress",
              completedAt: usage.completedDate ?? null,
              timeSpentMinutes: usage.totalMinutesViewed ?? null,
              lastActivityAt: usage.lastViewedDate ?? null,
            });
          }
        } catch (err) {
          console.error(
            `Pluralsight: failed to fetch progress for user ${user.id}:`,
            err
          );
        }

        await this.delay(this.REQUEST_DELAY_MS);
      }

      return progressResults;
    } catch (err) {
      console.error("Pluralsight fetchProgress failed, returning stubs:", err);
      return [...STUB_PROGRESS];
    }
  }

  // -----------------------------------------------------------------------
  // Extended methods (beyond PlatformAdapter interface)
  // -----------------------------------------------------------------------

  /**
   * Fetch available channels/paths.
   */
  async getChannels(
    credentials: Record<string, string>
  ): Promise<PluralsightChannel[]> {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const planId = credentials.plan_id;
      return await this.fetchAllPages<PluralsightChannel>(
        credentials,
        `/api/v1/plans/${planId}/channels`
      );
    } catch (err) {
      console.error("Pluralsight getChannels failed:", err);
      return [];
    }
  }

  /**
   * Fetch courses, optionally filtered by channel ID.
   */
  async getCourses(
    credentials: Record<string, string>,
    channelId?: string
  ): Promise<{ contentId: string; title: string }[]> {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const planId = credentials.plan_id;
      const path = channelId
        ? `/api/v1/plans/${planId}/channels/${channelId}/content`
        : `/api/v1/plans/${planId}/content`;

      const items = await this.fetchAllPages<{
        contentId: string;
        title: string;
      }>(credentials, path);

      return items;
    } catch (err) {
      console.error("Pluralsight getCourses failed:", err);
      return [];
    }
  }

  /**
   * Fetch user viewing activity within a date range.
   */
  async getUserActivity(
    credentials: Record<string, string>,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PluralsightCourseUsage[]> {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const planId = credentials.plan_id;
      return await this.fetchAllPages<PluralsightCourseUsage>(
        credentials,
        `/api/v1/plans/${planId}/users/${userId}/course-usage`,
        {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        }
      );
    } catch (err) {
      console.error("Pluralsight getUserActivity failed:", err);
      return [];
    }
  }

  /**
   * Fetch Skill IQ assessment results for a user.
   */
  async getSkillAssessments(
    credentials: Record<string, string>,
    userId: string
  ): Promise<PluralsightSkillAssessment[]> {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const planId = credentials.plan_id;
      return await this.fetchAllPages<PluralsightSkillAssessment>(
        credentials,
        `/api/v1/plans/${planId}/users/${userId}/skill-assessments`
      );
    } catch (err) {
      console.error("Pluralsight getSkillAssessments failed:", err);
      return [];
    }
  }
}
