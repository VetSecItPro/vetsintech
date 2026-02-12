import type { PlatformAdapter, ExternalPlatform } from "../types";

// ---------------------------------------------------------------------------
// Udemy Business API response types
// ---------------------------------------------------------------------------

interface UdemyUser {
  id: number;
  email: string;
  name: string;
  surname: string;
  is_active: boolean;
}

interface UdemyCourseEnrollment {
  course_id: number;
  course_title: string;
  enrollment_date: string | null;
}

interface UdemyCourseActivity {
  user_email: string;
  course_id: number;
  course_title: string;
  completion_ratio: number;
  num_video_consumed_minutes: number | null;
  last_accessed_date: string | null;
  completion_date: string | null;
}

interface UdemyCourseDetail {
  id: number;
  title: string;
  headline: string | null;
  num_lectures: number | null;
  content_length_video: number | null;
  url: string;
}

interface UdemyPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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
 * Udemy Business REST API Adapter
 *
 * Authentication: Basic Auth (client_id:client_secret) or Bearer token.
 * Required credentials:
 *   - api_key: Udemy Business API key (or client_id:client_secret)
 *   - account_id: Udemy Business account ID (subdomain)
 *
 * API Base URL: https://{account_id}.udemy.com/api-2.0/organizations/{account_id}
 *
 * Falls back to empty stub data when credentials are not configured.
 */
export class UdemyAdapter implements PlatformAdapter {
  platform: ExternalPlatform = "udemy";

  /** Minimum ms to wait between paginated API requests (rate-limit safety). */
  private readonly REQUEST_DELAY_MS = 300;

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private hasCredentials(credentials: Record<string, string>): boolean {
    const { api_key, account_id } = credentials;
    return Boolean(api_key && account_id);
  }

  private getBaseUrl(credentials: Record<string, string>): string {
    const accountId = credentials.account_id;
    return `https://${accountId}.udemy.com/api-2.0/organizations/${accountId}`;
  }

  private getAuthHeaders(credentials: Record<string, string>): HeadersInit {
    const { api_key } = credentials;

    // Support both Basic Auth (client_id:client_secret format) and Bearer token
    if (api_key.includes(":")) {
      const encoded = Buffer.from(api_key).toString("base64");
      return {
        Authorization: `Basic ${encoded}`,
        Accept: "application/json",
      };
    }

    return {
      Authorization: `Bearer ${api_key}`,
      Accept: "application/json",
    };
  }

  /**
   * Authenticated GET request to the Udemy Business API.
   */
  private async apiGet<T>(
    credentials: Record<string, string>,
    path: string,
    params?: Record<string, string>
  ): Promise<UdemyPaginatedResponse<T>> {
    const baseUrl = this.getBaseUrl(credentials);
    const url = new URL(`${baseUrl}${path}`);
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
      throw new Error(`Udemy API error (${res.status}): ${text}`);
    }

    return (await res.json()) as UdemyPaginatedResponse<T>;
  }

  /**
   * Fetch all pages from a paginated Udemy endpoint.
   */
  private async fetchAllPages<T>(
    credentials: Record<string, string>,
    path: string,
    params?: Record<string, string>
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    const pageSize = 100;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const pageParams = {
        ...params,
        page: String(page),
        page_size: String(pageSize),
      };

      const result = await this.apiGet<T>(credentials, path, pageParams);
      allItems.push(...result.results);

      if (!result.next || result.results.length < pageSize) {
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
      const baseUrl = this.getBaseUrl(credentials);
      const res = await fetch(`${baseUrl}/users/list/?page=1&page_size=1`, {
        headers: this.getAuthHeaders(credentials),
      });
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
      const emailSet = new Set(orgUserEmails.map((e) => e.toLowerCase()));

      // Use the bulk analytics endpoint for efficiency
      const activities = await this.fetchAllPages<UdemyCourseActivity>(
        credentials,
        "/analytics/user-course-activity/"
      );

      const enrollments: {
        courseId: string;
        courseTitle: string;
        userEmail: string;
        enrolledAt: string | null;
      }[] = [];

      // Deduplicate by user_email:course_id
      const seen = new Set<string>();

      for (const activity of activities) {
        const email = activity.user_email?.toLowerCase();
        if (!email || !emailSet.has(email)) continue;

        const key = `${email}:${activity.course_id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        enrollments.push({
          courseId: String(activity.course_id),
          courseTitle: activity.course_title,
          userEmail: email,
          enrolledAt: null, // activity endpoint may not include enrollment date
        });
      }

      // If analytics endpoint returned no results, fallback to user-by-user
      if (enrollments.length === 0 && orgUserEmails.length > 0) {
        const users = await this.fetchAllPages<UdemyUser>(
          credentials,
          "/users/list/"
        );

        for (const user of users) {
          const email = user.email?.toLowerCase();
          if (!email || !emailSet.has(email)) continue;

          try {
            const userEnrollments =
              await this.fetchAllPages<UdemyCourseEnrollment>(
                credentials,
                `/users/${user.id}/course-enrollments/`
              );

            for (const enrollment of userEnrollments) {
              enrollments.push({
                courseId: String(enrollment.course_id),
                courseTitle: enrollment.course_title,
                userEmail: email,
                enrolledAt: enrollment.enrollment_date ?? null,
              });
            }
          } catch (err) {
            console.error(
              `Udemy: failed to fetch enrollments for user ${user.id}:`,
              err
            );
          }

          await this.delay(this.REQUEST_DELAY_MS);
        }
      }

      return enrollments;
    } catch (err) {
      console.error("Udemy fetchEnrollments failed, returning stubs:", err);
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
      // Build enrollment lookup
      const enrollmentSet = new Set(
        enrollments.map(
          (e) => `${e.userEmail.toLowerCase()}:${e.courseId}`
        )
      );

      // Fetch activity data from the analytics endpoint
      const activities = await this.fetchAllPages<UdemyCourseActivity>(
        credentials,
        "/analytics/user-course-activity/"
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
        const email = activity.user_email?.toLowerCase();
        const courseId = String(activity.course_id);
        const key = `${email}:${courseId}`;

        if (!enrollmentSet.has(key)) continue;

        const progressPct = Math.round(
          (activity.completion_ratio ?? 0) * 100
        );
        const isCompleted =
          activity.completion_ratio >= 1.0 ||
          Boolean(activity.completion_date);

        progressResults.push({
          courseId,
          userEmail: email,
          progressPercentage: Math.min(progressPct, 100),
          status: isCompleted ? "completed" : "in_progress",
          completedAt: activity.completion_date ?? null,
          timeSpentMinutes: activity.num_video_consumed_minutes ?? null,
          lastActivityAt: activity.last_accessed_date ?? null,
        });
      }

      return progressResults;
    } catch (err) {
      console.error("Udemy fetchProgress failed, returning stubs:", err);
      return [...STUB_PROGRESS];
    }
  }

  // -----------------------------------------------------------------------
  // Extended methods (beyond PlatformAdapter interface)
  // -----------------------------------------------------------------------

  /**
   * Fetch the organization's course catalog with optional pagination.
   */
  async getCourses(
    credentials: Record<string, string>,
    page?: number,
    pageSize?: number
  ): Promise<{ id: number; title: string; url: string }[]> {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const params: Record<string, string> = {};
      if (page) params.page = String(page);
      if (pageSize) params.page_size = String(pageSize);

      // If no page specified, fetch all
      if (!page) {
        const items = await this.fetchAllPages<UdemyCourseDetail>(
          credentials,
          "/courses/list/",
          params
        );
        return items.map((c) => ({ id: c.id, title: c.title, url: c.url }));
      }

      const result = await this.apiGet<UdemyCourseDetail>(
        credentials,
        "/courses/list/",
        params
      );
      return result.results.map((c) => ({
        id: c.id,
        title: c.title,
        url: c.url,
      }));
    } catch (err) {
      console.error("Udemy getCourses failed:", err);
      return [];
    }
  }

  /**
   * Fetch detailed information about a specific course.
   */
  async getCourseDetails(
    credentials: Record<string, string>,
    courseId: number
  ): Promise<UdemyCourseDetail | null> {
    if (!this.hasCredentials(credentials)) return null;

    try {
      const baseUrl = this.getBaseUrl(credentials);
      const res = await fetch(`${baseUrl}/courses/${courseId}/`, {
        headers: this.getAuthHeaders(credentials),
      });

      if (!res.ok) return null;
      return (await res.json()) as UdemyCourseDetail;
    } catch (err) {
      console.error("Udemy getCourseDetails failed:", err);
      return null;
    }
  }

  /**
   * Fetch completed courses for a specific user email.
   */
  async getCompletions(
    credentials: Record<string, string>,
    userEmail: string
  ): Promise<
    {
      courseId: string;
      courseTitle: string;
      completedAt: string;
      timeSpentMinutes: number | null;
    }[]
  > {
    if (!this.hasCredentials(credentials)) return [];

    try {
      const activities = await this.fetchAllPages<UdemyCourseActivity>(
        credentials,
        "/analytics/user-course-activity/",
        { user_email: userEmail }
      );

      return activities
        .filter(
          (a) => a.completion_ratio >= 1.0 || Boolean(a.completion_date)
        )
        .map((a) => ({
          courseId: String(a.course_id),
          courseTitle: a.course_title,
          completedAt: a.completion_date ?? new Date().toISOString(),
          timeSpentMinutes: a.num_video_consumed_minutes ?? null,
        }));
    } catch (err) {
      console.error("Udemy getCompletions failed:", err);
      return [];
    }
  }

  /**
   * Fetch course activity for a specific user.
   */
  async getUserActivity(
    credentials: Record<string, string>,
    userEmail: string
  ): Promise<UdemyCourseActivity[]> {
    if (!this.hasCredentials(credentials)) return [];

    try {
      return await this.fetchAllPages<UdemyCourseActivity>(
        credentials,
        "/analytics/user-course-activity/",
        { user_email: userEmail }
      );
    } catch (err) {
      console.error("Udemy getUserActivity failed:", err);
      return [];
    }
  }
}
