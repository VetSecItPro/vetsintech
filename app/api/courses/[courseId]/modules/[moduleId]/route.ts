import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getModuleWithLessons } from "@/lib/domains/courses/queries";
import { updateModule, deleteModule } from "@/lib/domains/courses/mutations";
import { moduleSchema } from "@/lib/utils/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { moduleId } = await params;
    const courseModule = await getModuleWithLessons(moduleId);

    if (!courseModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: courseModule }, { status: 200 });
  } catch (error) {
    console.error(
      "GET /api/courses/[courseId]/modules/[moduleId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { moduleId } = await params;
    const body = await request.json();
    const parsed = moduleSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const updated = await updateModule(moduleId, parsed.data);

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error(
      "PATCH /api/courses/[courseId]/modules/[moduleId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { moduleId } = await params;
    await deleteModule(moduleId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "DELETE /api/courses/[courseId]/modules/[moduleId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
