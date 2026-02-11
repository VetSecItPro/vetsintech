import type { PlatformAdapter, ExternalPlatform } from "../types";

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
 *
 * Reference: https://build.coursera.org/app-platform/catalog/
 */
export class CourseraAdapter implements PlatformAdapter {
  platform: ExternalPlatform = "coursera";

  async validateCredentials(
    credentials: Record<string, string>
  ): Promise<boolean> {
    const { client_id, client_secret, org_slug } = credentials;

    // Check that all required credential fields are present and non-empty
    if (!client_id || !client_secret || !org_slug) {
      return false;
    }

    // TODO: Exchange client_id + client_secret for an access token via
    // POST https://api.coursera.org/oauth2/client_credentials/token
    // If the token exchange succeeds, credentials are valid.
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
    // TODO: Implement real Coursera for Business API integration
    //
    // 1. Authenticate via OAuth 2.0 client credentials:
    //    POST https://api.coursera.org/oauth2/client_credentials/token
    //    Body: { client_id, client_secret, grant_type: "client_credentials" }
    //
    // 2. Fetch program enrollments:
    //    GET https://api.coursera.org/api/businesses.v1/{orgSlug}/programs
    //    Then for each program:
    //    GET https://api.coursera.org/api/businesses.v1/{orgSlug}/programs/{programId}/enrollments
    //
    // 3. Filter enrollments to only include users whose email is in orgUserEmails
    //
    // 4. Map each enrollment to { courseId, courseTitle, userEmail, enrolledAt }

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
    // TODO: Implement real Coursera for Business API integration
    //
    // 1. Authenticate via OAuth 2.0 (reuse token from validateCredentials or fetch new one)
    //
    // 2. For each enrollment, fetch progress:
    //    GET https://api.coursera.org/api/businesses.v1/{orgSlug}/learnerActivity
    //    Query params: userEmail, courseId
    //
    // 3. Map response to progress objects with:
    //    - progressPercentage from grades/completion data
    //    - status: "completed" if grade >= passing, otherwise "in_progress"
    //    - completedAt from completion timestamp
    //    - timeSpentMinutes from learning hours data
    //    - lastActivityAt from last access timestamp

    void credentials;
    void enrollments;
    return [];
  }
}
