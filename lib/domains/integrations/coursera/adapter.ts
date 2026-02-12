import type { PlatformAdapter, ExternalPlatform } from "../types";

// ---------------------------------------------------------------------------
// Coursera Partner API response types
// ---------------------------------------------------------------------------

interface CourseraTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface CourseraProgram {
  id: string;
  name: string;
  slug: string;
}

interface CourseraEnrollmentRecord {
  userId: string;
  externalId: string;
  fullName: string;
  email: string;
  courseId: string;
  courseName: string;
  enrolledTimestamp: string | null;
}

interface CourseraLearnerActivity {
  courseId: string;
  email: string;
  overallProgress: number;
  completionStatus: string;
  completedTimestamp: string | null;
  totalLearningHours: number | null;
  lastActivityTimestamp: string | null;
}

interface CourseraPaginatedResponse<T> {
  elements: T[];
  paging?: {
    next?: string;
    total?: number;
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
 * Coursera for Business API Adapter
 *
 * Authentication: OAuth 2.0 client credentials flow.
 * Required credentials:
 *   - client_id: Coursera API client ID
 *   - client_secret: Coursera API client secret
 *   - org_slug: Coursera for Business organization slug
 *
 * API Base URL: https://api.coursera.org/api/businesses.v1
 * Token URL:    https://api.coursera.org/oauth2/client_credentials/token
 *
 * Falls back to empty stub data when credentials are not configured.
 */
export class CourseraAdapter implements PlatformAdapter {
  platform: ExternalPlatform = "coursera";

  private readonly TOKEN_URL =
    "https://api.coursera.org/oauth2/client_credentials/token";
  private readonly API_BASE = "https://api.coursera.org/api/businesses.v1";

  /** Minimum ms to wait between paginated API requests (rate-limit safety). */
  private readonly REQUEST_DELAY_MS = 200;

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private hasCredentials(credentials: Record<string, string>): boolean {
    const { client_id, client_secret, org_slug } = credentials;
    return Boolean(client_id && client_secret && org_slug);
  }

  /**
   * Exchange client credentials for an access token.
   */
  private async getAccessToken(
    credentials: Record<string, string>
  ): Promise<string> {
    const { client_id, client_secret } = credentials;

    const body = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "client_credentials",
    });

    const res = await fetch(this.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Coursera token exchange failed (${res.status}): ${text}`
      );
    }

    const data = (await res.json()) as CourseraTokenResponse;
    return data.access_token;
  }

  /**
   * Authenticated GET request to the Coursera API with pagination support.
   */
  private async apiGet<T>(
    token: string,
    path: string,
    params?: Record<string, string>
  ): Promise<CourseraPaginatedResponse<T>> {
    const url = new URL(`${this.API_BASE}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Coursera API error (${res.status}): ${text}`);
    }

    return (await res.json()) as CourseraPaginatedResponse<T>;
  }

  /**
   * Fetch all pages from a paginated Coursera endpoint.
   */
  private async fetchAllPages<T>(
    token: string,
    path: string,
    params?: Record<string, string>
  ): Promise<T[]> {
    const allElements: T[] = [];
    let start = 0;
    const limit = 100;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const pageParams = {
        ...params,
        start: String(start),
        limit: String(limit),
      };

      const page = await this.apiGet<T>(token, path, pageParams);
      allElements.push(...page.elements);

      if (
        !page.paging?.next ||
        page.elements.length < limit
      ) {
        break;
      }

      start += limit;
      await this.delay(this.REQUEST_DELAY_MS);
    }

    return allElements;
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
      await this.getAccessToken(credentials);
      return true;
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
    // Graceful fallback when credentials are not configured
    if (!this.hasCredentials(credentials)) {
      return [...STUB_ENROLLMENTS];
    }

    try {
      const token = await this.getAccessToken(credentials);
      const orgSlug = credentials.org_slug;
      const emailSet = new Set(orgUserEmails.map((e) => e.toLowerCase()));

      // 1. Fetch programs for the organization
      const programs = await this.fetchAllPages<CourseraProgram>(
        token,
        `/${orgSlug}/programs`
      );

      // 2. Fetch enrollments from each program
      const enrollments: {
        courseId: string;
        courseTitle: string;
        userEmail: string;
        enrolledAt: string | null;
      }[] = [];

      for (const program of programs) {
        try {
          const records = await this.fetchAllPages<CourseraEnrollmentRecord>(
            token,
            `/${orgSlug}/programs/${program.id}/enrollments`
          );

          for (const record of records) {
            const email = record.email?.toLowerCase();
            if (email && emailSet.has(email)) {
              enrollments.push({
                courseId: record.courseId,
                courseTitle: record.courseName,
                userEmail: email,
                enrolledAt: record.enrolledTimestamp ?? null,
              });
            }
          }
        } catch (err) {
          // Log per-program failures but continue with other programs
          console.error(
            `Coursera: failed to fetch enrollments for program ${program.id}:`,
            err
          );
        }

        await this.delay(this.REQUEST_DELAY_MS);
      }

      return enrollments;
    } catch (err) {
      console.error("Coursera fetchEnrollments failed, returning stubs:", err);
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
      const token = await this.getAccessToken(credentials);
      const orgSlug = credentials.org_slug;

      // Build a lookup for fast matching
      const enrollmentSet = new Set(
        enrollments.map((e) => `${e.userEmail.toLowerCase()}:${e.courseId}`)
      );

      // Fetch learner activity for the organization
      const activities = await this.fetchAllPages<CourseraLearnerActivity>(
        token,
        `/${orgSlug}/learnerActivity`
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

      for (const activity of activities) {
        const email = activity.email?.toLowerCase();
        const key = `${email}:${activity.courseId}`;
        if (!enrollmentSet.has(key)) continue;

        const progressPct = Math.round((activity.overallProgress ?? 0) * 100);
        const isCompleted =
          activity.completionStatus === "COMPLETED" || progressPct >= 100;

        progressResults.push({
          courseId: activity.courseId,
          userEmail: email,
          progressPercentage: Math.min(progressPct, 100),
          status: isCompleted ? "completed" : "in_progress",
          completedAt: activity.completedTimestamp ?? null,
          timeSpentMinutes: activity.totalLearningHours
            ? Math.round(activity.totalLearningHours * 60)
            : null,
          lastActivityAt: activity.lastActivityTimestamp ?? null,
        });
      }

      return progressResults;
    } catch (err) {
      console.error("Coursera fetchProgress failed, returning stubs:", err);
      return [...STUB_PROGRESS];
    }
  }

  // -----------------------------------------------------------------------
  // Extended methods (beyond PlatformAdapter interface)
  // -----------------------------------------------------------------------

  /**
   * Exchange an authorization code for tokens (OAuth2 authorization code grant).
   */
  async authenticate(
    code: string,
    credentials: Record<string, string>
  ): Promise<CourseraTokenResponse> {
    const { client_id, client_secret } = credentials;

    const body = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code,
    });

    const res = await fetch(this.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Coursera authorization code exchange failed (${res.status}): ${text}`
      );
    }

    return (await res.json()) as CourseraTokenResponse;
  }

  /**
   * Refresh an expired access token.
   */
  async refreshToken(
    refreshTokenValue: string,
    credentials: Record<string, string>
  ): Promise<CourseraTokenResponse> {
    const { client_id, client_secret } = credentials;

    const body = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
    });

    const res = await fetch(this.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Coursera token refresh failed (${res.status}): ${text}`
      );
    }

    return (await res.json()) as CourseraTokenResponse;
  }

  /**
   * Fetch the course catalog for the organization.
   */
  async getCourses(
    credentials: Record<string, string>
  ): Promise<{ id: string; name: string; slug: string }[]> {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const token = await this.getAccessToken(credentials);
      const orgSlug = credentials.org_slug;

      const programs = await this.fetchAllPages<CourseraProgram>(
        token,
        `/${orgSlug}/programs`
      );

      return programs.map((p) => ({ id: p.id, name: p.name, slug: p.slug }));
    } catch (err) {
      console.error("Coursera getCourses failed:", err);
      return [];
    }
  }

  /**
   * Fetch completions (completed courses with certificates) for a user email.
   */
  async getCompletions(
    credentials: Record<string, string>,
    userEmail: string
  ): Promise<
    {
      courseId: string;
      courseTitle: string;
      completedAt: string;
      certificateUrl: string | null;
    }[]
  > {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const token = await this.getAccessToken(credentials);
      const orgSlug = credentials.org_slug;

      const activities = await this.fetchAllPages<CourseraLearnerActivity>(
        token,
        `/${orgSlug}/learnerActivity`,
        { email: userEmail }
      );

      return activities
        .filter((a) => a.completionStatus === "COMPLETED")
        .map((a) => ({
          courseId: a.courseId,
          courseTitle: a.courseId, // Coursera learnerActivity may not return title
          completedAt: a.completedTimestamp ?? new Date().toISOString(),
          certificateUrl: null, // Certificate URL requires separate API call
        }));
    } catch (err) {
      console.error("Coursera getCompletions failed:", err);
      return [];
    }
  }
}
