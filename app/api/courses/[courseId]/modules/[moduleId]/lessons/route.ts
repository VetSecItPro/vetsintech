import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getLessonsByModule } from "@/lib/domains/courses/queries";
import { createLesson, reorderLessons } from "@/lib/domains/courses/mutations";
import { lessonSchema } from "@/lib/utils/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { moduleId } = await params;
    const lessons = await getLessonsByModule(moduleId);

    return NextResponse.json({ data: lessons }, { status: 200 });
  } catch (error) {
    console.error(
      "GET /api/courses/[courseId]/modules/[moduleId]/lessons error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { moduleId } = await params;
    const body = await request.json();
    const parsed = lessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const lesson = await createLesson({
      module_id: moduleId,
      ...parsed.data,
    });

    return NextResponse.json({ data: lesson }, { status: 201 });
  } catch (error) {
    console.error(
      "POST /api/courses/[courseId]/modules/[moduleId]/lessons error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const reorderSchema = z.object({
  lessonIds: z.array(z.string().uuid()),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { moduleId } = await params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    await reorderLessons(moduleId, parsed.data.lessonIds);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "PATCH /api/courses/[courseId]/modules/[moduleId]/lessons error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
