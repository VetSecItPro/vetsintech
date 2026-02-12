import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { updateGradeOverride, deleteGradeOverride } from "@/lib/domains/gradebook/mutations";
import { updateGradeOverrideSchema } from "@/lib/domains/gradebook/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string; overrideId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { overrideId } = await params;
    const body = await request.json();
    const parsed = updateGradeOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const override = await updateGradeOverride(overrideId, parsed.data);

    return NextResponse.json({ data: override }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/gradebook/.../overrides/[overrideId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string; overrideId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { overrideId } = await params;
    await deleteGradeOverride(overrideId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/gradebook/.../overrides/[overrideId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
