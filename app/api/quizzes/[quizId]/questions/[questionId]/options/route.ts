import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { addOptionsToQuestion } from "@/lib/domains/quizzes/mutations";
import { quizOptionSchema } from "@/lib/utils/validation";

/**
 * POST /api/quizzes/[quizId]/questions/[questionId]/options
 * Add option(s) to a question. Admin/instructor only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { questionId } = await params;
    const body = await request.json();
    const parsed = z.array(quizOptionSchema).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const options = await addOptionsToQuestion(questionId, parsed.data);
    return NextResponse.json({ data: options }, { status: 201 });
  } catch (error) {
    console.error(
      "POST /api/quizzes/[quizId]/questions/[questionId]/options error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
