import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { updateOption, deleteOption } from "@/lib/domains/quizzes/mutations";
import { quizOptionSchema } from "@/lib/utils/validation";

/**
 * PATCH /api/quizzes/[quizId]/questions/[questionId]/options/[optionId]
 * Update a single option. Admin/instructor only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string; optionId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { optionId } = await params;
    const body = await request.json();
    const parsed = quizOptionSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const option = await updateOption(optionId, parsed.data);
    return NextResponse.json({ data: option }, { status: 200 });
  } catch (error) {
    console.error(
      "PATCH /api/quizzes/[quizId]/questions/[questionId]/options/[optionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quizzes/[quizId]/questions/[questionId]/options/[optionId]
 * Delete a single option. Admin only.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string; optionId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { optionId } = await params;
    await deleteOption(optionId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "DELETE /api/quizzes/[quizId]/questions/[questionId]/options/[optionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
