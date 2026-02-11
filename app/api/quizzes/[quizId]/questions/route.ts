import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { addQuestion, reorderQuestions } from "@/lib/domains/quizzes/mutations";
import { questionSchema } from "@/lib/utils/validation";

/**
 * POST /api/quizzes/[quizId]/questions
 * Add a question to a quiz. Admin/instructor only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { quizId } = await params;
    const body = await request.json();
    const parsed = questionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const question = await addQuestion({
      quiz_id: quizId,
      question_text: parsed.data.question_text,
      question_type: parsed.data.question_type,
      points: parsed.data.points,
      explanation: parsed.data.explanation,
      options: parsed.data.options,
    });

    return NextResponse.json({ data: question }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quizzes/[quizId]/questions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const reorderSchema = z.object({
  question_ids: z.array(z.string().uuid()),
});

/**
 * PATCH /api/quizzes/[quizId]/questions
 * Reorder questions in a quiz. Admin/instructor only.
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
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    await reorderQuestions(quizId, parsed.data.question_ids);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/quizzes/[quizId]/questions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
