import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getQuizById } from "@/lib/domains/quizzes/queries";
import { updateQuiz, deleteQuiz } from "@/lib/domains/quizzes/mutations";
import { quizSchema } from "@/lib/utils/validation";

/**
 * GET /api/quizzes/[quizId]
 * Get a quiz with all questions and options.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { quizId } = await params;
    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ data: quiz }, { status: 200 });
  } catch (error) {
    console.error("GET /api/quizzes/[quizId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quizzes/[quizId]
 * Update quiz settings. Admin/instructor only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { quizId } = await params;
    const body = await request.json();
    const parsed = quizSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const quiz = await updateQuiz(quizId, parsed.data);
    return NextResponse.json({ data: quiz }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/quizzes/[quizId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quizzes/[quizId]
 * Delete a quiz. Admin only.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { quizId } = await params;
    await deleteQuiz(quizId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/quizzes/[quizId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
