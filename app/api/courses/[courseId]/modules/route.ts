import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getModulesByCourse } from "@/lib/domains/courses/queries";
import { createModule, reorderModules } from "@/lib/domains/courses/mutations";
import { moduleSchema } from "@/lib/utils/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const modules = await getModulesByCourse(courseId);

    return NextResponse.json({ data: modules }, { status: 200 });
  } catch (error) {
    console.error("GET /api/courses/[courseId]/modules error:", error);
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
    const parsed = moduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const courseModule = await createModule({
      course_id: courseId,
      ...parsed.data,
    });

    return NextResponse.json({ data: courseModule }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses/[courseId]/modules error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const reorderSchema = z.object({
  moduleIds: z.array(z.string().uuid()),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    await reorderModules(courseId, parsed.data.moduleIds);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/courses/[courseId]/modules error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
