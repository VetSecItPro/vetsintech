import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getQuizAttempts } from "@/lib/domains/quizzes/queries";
import { submitQuizAttempt } from "@/lib/domains/quizzes/mutations";

const submitSchema = z.object({
  cohort_id: z.string().uuid("Invalid cohort ID"),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      selected_option_id: z.string().uuid().nullable().optional(),
      text_answer: z.string().nullable().optional(),
    })
  ),
});

/**
 * GET /api/quizzes/[quizId]/attempt?cohort_id=xxx
 * Get all attempts for the current user on this quiz.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { quizId } = await params;
    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get("cohort_id");

    if (!cohortId) {
      return NextResponse.json(
        { error: "cohort_id query parameter is required" },
        { status: 400 }
      );
    }

    const attempts = await getQuizAttempts(auth.user.id, quizId, cohortId);
    return NextResponse.json({ data: attempts }, { status: 200 });
  } catch (error) {
    console.error("GET /api/quizzes/[quizId]/attempt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quizzes/[quizId]/attempt
 * Submit a quiz attempt for grading.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { quizId } = await params;
    const body = await request.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const result = await submitQuizAttempt({
      quiz_id: quizId,
      user_id: auth.user.id,
      cohort_id: parsed.data.cohort_id,
      answers: parsed.data.answers,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot attempt")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("POST /api/quizzes/[quizId]/attempt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
