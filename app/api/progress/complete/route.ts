import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { markLessonComplete } from "@/lib/domains/progress/mutations";

const completeSchema = z.object({
  lesson_id: z.string().uuid("Invalid lesson ID"),
  cohort_id: z.string().uuid("Invalid cohort ID"),
  time_spent_seconds: z.number().int().min(0).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = completeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const completion = await markLessonComplete({
      user_id: auth.user.id,
      lesson_id: parsed.data.lesson_id,
      cohort_id: parsed.data.cohort_id,
      time_spent_seconds: parsed.data.time_spent_seconds,
    });

    return NextResponse.json({ data: completion }, { status: 200 });
  } catch (error) {
    console.error("POST /api/progress/complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
