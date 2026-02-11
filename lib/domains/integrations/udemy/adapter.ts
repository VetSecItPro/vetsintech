import type { PlatformAdapter, ExternalPlatform } from "../types";

/**
 * Udemy Business REST API Adapter
 *
 * Authentication: Bearer token (Organization API key).
 * Required credentials:
 *   - api_key: Udemy Business API key
 *   - account_id: Udemy Business account ID (subdomain)
 *
 * API Base URL: https://{account_id}.udemy.com/api-2.0/organizations/{account_id}
 *
 * Reference: https://www.udemy.com/developers/affiliate/
 *            https://business-support.udemy.com/hc/en-us/articles/115005527148
 */
export class UdemyAdapter implements PlatformAdapter {
  platform: ExternalPlatform = "udemy";

  async validateCredentials(
    credentials: Record<string, string>
  ): Promise<boolean> {
    const { api_key, account_id } = credentials;

    // Check that all required credential fields are present and non-empty
    if (!api_key || !account_id) {
      return false;
    }

    // TODO: Validate the API key by making a test request:
    // GET https://{account_id}.udemy.com/api-2.0/organizations/{account_id}/users/list/
    // Headers: { Authorization: "Bearer {api_key}" }
    // If the response is 200, credentials are valid.
    return true;
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
    // TODO: Implement real Udemy Business API integration
    //
    // 1. Authenticate with Bearer token:
    //    Headers: { Authorization: "Bearer {api_key}" }
    //
    // 2. Fetch user enrollments:
    //    GET https://{account_id}.udemy.com/api-2.0/organizations/{account_id}/users/list/
    //    This returns users with their enrolled courses.
    //
    // 3. For each user, fetch their course enrollments:
    //    GET https://{account_id}.udemy.com/api-2.0/organizations/{account_id}/users/{userId}/course-enrollments/
    //    Response includes: course_id, course_title, enrollment_date
    //
    // 4. Alternatively, use the bulk report endpoint:
    //    GET https://{account_id}.udemy.com/api-2.0/organizations/{account_id}/analytics/user-course-activity/
    //
    // 5. Filter to only include users whose email is in orgUserEmails
    //
    // 6. Map each enrollment to { courseId, courseTitle, userEmail, enrolledAt }

    void credentials;
    void orgUserEmails;
    return [];
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
    // TODO: Implement real Udemy Business API integration
    //
    // 1. Authenticate with Bearer token
    //
    // 2. Fetch course activity/progress:
    //    GET https://{account_id}.udemy.com/api-2.0/organizations/{account_id}/analytics/user-course-activity/
    //    Query params: { user_email, course_id }
    //    Response includes: completion_ratio, num_video_consumed_minutes, last_accessed_date
    //
    // 3. Alternatively, fetch per-user progress:
    //    GET https://{account_id}.udemy.com/api-2.0/organizations/{account_id}/users/{userId}/course-progress/
    //
    // 4. Map response to progress objects:
    //    - progressPercentage from completion_ratio * 100
    //    - status: "completed" if completion_ratio >= 1.0, otherwise "in_progress"
    //    - completedAt from completion_date if available
    //    - timeSpentMinutes from num_video_consumed_minutes
    //    - lastActivityAt from last_accessed_date

    void credentials;
    void enrollments;
    return [];
  }
}
