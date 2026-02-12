import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getAssignmentsByCourse } from "@/lib/domains/assignments/queries";
import { createAssignment } from "@/lib/domains/assignments/mutations";
import { createAssignmentSchema } from "@/lib/domains/assignments/validation";

/**
 * GET /api/assignments?course_id=xxx
 * List assignments for a course.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");

    if (!courseId) {
      return NextResponse.json(
        { error: "course_id query parameter is required" },
        { status: 400 }
      );
    }

    const assignments = await getAssignmentsByCourse(courseId);
    return NextResponse.json({ data: assignments }, { status: 200 });
  } catch (error) {
    console.error("GET /api/assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignments
 * Create a new assignment. Admin/instructor only.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const assignment = await createAssignment({
      ...parsed.data,
      organization_id: auth.organizationId,
      created_by: auth.user.id,
    });

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
