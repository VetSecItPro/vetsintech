import type { PlatformAdapter, ExternalPlatform } from "../types";

/**
 * Pluralsight Skills (formerly Pluralsight One / Pluralsight for Teams) Adapter
 *
 * Authentication: API token-based authentication.
 * Required credentials:
 *   - api_token: Pluralsight API bearer token
 *   - plan_id: Pluralsight plan/team ID
 *
 * API Base URL: https://api.pluralsight.com
 * GraphQL Endpoint: https://paas-api.pluralsight.com/graphql
 *
 * Reference: https://www.pluralsight.com/product/professional-services/api
 */
export class PluralsightAdapter implements PlatformAdapter {
  platform: ExternalPlatform = "pluralsight";

  async validateCredentials(
    credentials: Record<string, string>
  ): Promise<boolean> {
    const { api_token, plan_id } = credentials;

    // Check that all required credential fields are present and non-empty
    if (!api_token || !plan_id) {
      return false;
    }

    // TODO: Validate the token by making a test query to the Pluralsight API:
    // GET https://api.pluralsight.com/api/v1/plans/{planId}
    // Headers: { Authorization: "Bearer {api_token}" }
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
    // TODO: Implement real Pluralsight API integration
    //
    // 1. Authenticate with Bearer token:
    //    Headers: { Authorization: "Bearer {api_token}" }
    //
    // 2. Fetch team members and their course assignments via GraphQL:
    //    POST https://paas-api.pluralsight.com/graphql
    //    Query:
    //    {
    //      learners(planId: "{plan_id}") {
    //        nodes {
    //          email
    //          courseAssignments {
    //            courseId
    //            courseTitle
    //            assignedAt
    //          }
    //        }
    //      }
    //    }
    //
    // 3. Alternatively, use the REST Reports API:
    //    GET https://api.pluralsight.com/api/v1/plans/{planId}/users
    //    Then per user:
    //    GET https://api.pluralsight.com/api/v1/plans/{planId}/users/{userId}/course-usage
    //
    // 4. Filter to only include users whose email is in orgUserEmails
    //
    // 5. Map each assignment to { courseId, courseTitle, userEmail, enrolledAt }

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
    // TODO: Implement real Pluralsight API integration
    //
    // 1. Authenticate with Bearer token
    //
    // 2. Fetch content progress via GraphQL:
    //    POST https://paas-api.pluralsight.com/graphql
    //    Query:
    //    {
    //      contentProgress(planId: "{plan_id}", email: "{email}") {
    //        nodes {
    //          contentId
    //          percentComplete
    //          status
    //          completedAt
    //          totalMinutesViewed
    //          lastViewedAt
    //        }
    //      }
    //    }
    //
    // 3. Alternatively, use the REST Reports API:
    //    GET https://api.pluralsight.com/api/v1/plans/{planId}/users/{userId}/course-usage
    //
    // 4. Map response to progress objects:
    //    - progressPercentage from percentComplete
    //    - status from completion status
    //    - completedAt from completedAt timestamp
    //    - timeSpentMinutes from totalMinutesViewed
    //    - lastActivityAt from lastViewedAt

    void credentials;
    void enrollments;
    return [];
  }
}
