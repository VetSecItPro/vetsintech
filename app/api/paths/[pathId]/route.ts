import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getLearningPathById } from "@/lib/domains/learning-paths/queries";
import {
  updateLearningPath,
  deleteLearningPath,
} from "@/lib/domains/learning-paths/mutations";
import {
  learningPathSchema,
  learningPathStatusSchema,
} from "@/lib/domains/learning-paths/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { pathId } = await params;
    const path = await getLearningPathById(pathId, auth.organizationId);

    if (!path) {
      return NextResponse.json(
        { error: "Learning path not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: path }, { status: 200 });
  } catch (error) {
    console.error("GET /api/paths/[pathId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { pathId } = await params;
    const body = await request.json();

    const updateSchema = learningPathSchema.partial().extend({
      status: learningPathStatusSchema.optional(),
    });

    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const path = await updateLearningPath(
      pathId,
      auth.organizationId,
      parsed.data
    );

    return NextResponse.json({ data: path }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/paths/[pathId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { pathId } = await params;
    await deleteLearningPath(pathId, auth.organizationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/paths/[pathId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
