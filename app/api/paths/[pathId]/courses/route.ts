import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getLearningPathWithCourses } from "@/lib/domains/learning-paths/queries";
import {
  addCoursesToPath,
  removeCourseFromPath,
  reorderPathCourses,
} from "@/lib/domains/learning-paths/mutations";
import {
  addCoursesToPathSchema,
  reorderPathCoursesSchema,
} from "@/lib/domains/learning-paths/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { pathId } = await params;
    const pathWithCourses = await getLearningPathWithCourses(
      pathId,
      auth.organizationId
    );

    if (!pathWithCourses) {
      return NextResponse.json(
        { error: "Learning path not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: pathWithCourses.courses },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/paths/[pathId]/courses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { pathId } = await params;
    const body = await request.json();
    const parsed = addCoursesToPathSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const pathCourses = await addCoursesToPath(pathId, parsed.data.courses);

    return NextResponse.json({ data: pathCourses }, { status: 201 });
  } catch (error) {
    console.error("POST /api/paths/[pathId]/courses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: reorder courses or remove a course.
 * Body: { course_ids: string[] } for reorder
 * Body: { remove_course_id: string } for removal
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { pathId } = await params;
    const body = await request.json();

    // Check if this is a reorder or a remove
    if (body.remove_course_id) {
      const courseId = body.remove_course_id;
      if (typeof courseId !== "string") {
        return NextResponse.json(
          { error: "remove_course_id must be a string" },
          { status: 400 }
        );
      }
      await removeCourseFromPath(pathId, courseId);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Otherwise treat as reorder
    const parsed = reorderPathCoursesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    await reorderPathCourses(pathId, parsed.data.course_ids);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/paths/[pathId]/courses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
