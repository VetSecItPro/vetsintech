import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";
import { updateQuestion, deleteQuestion } from "@/lib/domains/quizzes/mutations";
import { questionSchema } from "@/lib/utils/validation";

/**
 * GET /api/quizzes/[quizId]/questions/[questionId]
 * Get a single question with its options. Any authenticated user.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { quizId, questionId } = await params;
    const supabase = await createClient();

    const { data: question, error } = await supabase
      .from("quiz_questions")
      .select("*, options:quiz_options(*)")
      .eq("id", questionId)
      .eq("quiz_id", quizId)
      .order("sort_order", { referencedTable: "quiz_options", ascending: true })
      .single();

    if (error || !question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: question }, { status: 200 });
  } catch (error) {
    console.error(
      "GET /api/quizzes/[quizId]/questions/[questionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quizzes/[quizId]/questions/[questionId]
 * Update a question. Admin/instructor only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { questionId } = await params;
    const body = await request.json();
    const parsed = questionSchema.omit({ options: true }).partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const question = await updateQuestion(questionId, parsed.data);
    return NextResponse.json({ data: question }, { status: 200 });
  } catch (error) {
    console.error(
      "PATCH /api/quizzes/[quizId]/questions/[questionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quizzes/[quizId]/questions/[questionId]
 * Delete a question. Admin only.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { questionId } = await params;
    await deleteQuestion(questionId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "DELETE /api/quizzes/[quizId]/questions/[questionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
