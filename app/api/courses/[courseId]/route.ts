import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCourseById } from "@/lib/domains/courses/queries";
import { updateCourse, deleteCourse } from "@/lib/domains/courses/mutations";
import { courseSchema, courseStatusSchema } from "@/lib/utils/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const course = await getCourseById(courseId, auth.organizationId);

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: course }, { status: 200 });
  } catch (error) {
    console.error("GET /api/courses/[courseId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const body = await request.json();

    // Build update schema that includes status alongside course fields
    const updateSchema = courseSchema.partial().extend({
      status: courseStatusSchema.optional(),
    });

    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const course = await updateCourse(
      courseId,
      auth.organizationId,
      parsed.data
    );

    return NextResponse.json({ data: course }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/courses/[courseId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    await deleteCourse(courseId, auth.organizationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/courses/[courseId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
