import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getQuizByLessonId } from "@/lib/domains/quizzes/queries";
import { createQuiz } from "@/lib/domains/quizzes/mutations";
import { quizSchema } from "@/lib/utils/validation";

/**
 * GET /api/quizzes?lesson_id=xxx
 * Get quiz for a specific lesson.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lesson_id");

    if (!lessonId) {
      return NextResponse.json(
        { error: "lesson_id query parameter is required" },
        { status: 400 }
      );
    }

    const quiz = await getQuizByLessonId(lessonId);
    return NextResponse.json({ data: quiz }, { status: 200 });
  } catch (error) {
    console.error("GET /api/quizzes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const createQuizSchema = quizSchema.extend({
  lesson_id: z.string().uuid("Invalid lesson ID"),
});

/**
 * POST /api/quizzes
 * Create a new quiz. Admin/instructor only.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createQuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const quiz = await createQuiz(parsed.data);
    return NextResponse.json({ data: quiz }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quizzes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
