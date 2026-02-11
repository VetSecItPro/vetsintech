import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import {
  getCourseProgress,
  getStudentEnrollments,
  getStudentProgressSummary,
} from "@/lib/domains/progress/queries";

/**
 * GET /api/progress
 * Query params:
 *   ?cohort_id=xxx — get progress for a specific cohort
 *   ?summary=true  — get aggregate progress summary
 *   (default)      — get all enrollments with progress
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get("cohort_id");
    const summary = searchParams.get("summary");

    // Specific cohort progress
    if (cohortId) {
      const progress = await getCourseProgress(auth.user.id, cohortId);
      return NextResponse.json({ data: progress }, { status: 200 });
    }

    // Aggregate summary
    if (summary === "true") {
      const summaryData = await getStudentProgressSummary(
        auth.user.id,
        auth.organizationId
      );
      return NextResponse.json({ data: summaryData }, { status: 200 });
    }

    // All enrollments with progress
    const enrollments = await getStudentEnrollments(
      auth.user.id,
      auth.organizationId
    );
    return NextResponse.json({ data: enrollments }, { status: 200 });
  } catch (error) {
    console.error("GET /api/progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
