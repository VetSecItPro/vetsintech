import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getGradeOverrides } from "@/lib/domains/gradebook/queries";
import { createGradeOverride } from "@/lib/domains/gradebook/mutations";
import { createGradeOverrideSchema } from "@/lib/domains/gradebook/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id") || undefined;

    // Students can only see their own overrides
    const isAdmin = auth.roles.includes("admin") || auth.roles.includes("instructor");
    const effectiveStudentId = isAdmin ? studentId : auth.user.id;

    const overrides = await getGradeOverrides(courseId, effectiveStudentId);

    return NextResponse.json({ data: overrides }, { status: 200 });
  } catch (error) {
    console.error("GET /api/gradebook/[courseId]/overrides error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const body = await request.json();
    const parsed = createGradeOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const override = await createGradeOverride({
      ...parsed.data,
      course_id: courseId,
      graded_by: auth.user.id,
      organization_id: auth.organizationId,
    });

    return NextResponse.json({ data: override }, { status: 201 });
  } catch (error) {
    console.error("POST /api/gradebook/[courseId]/overrides error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
