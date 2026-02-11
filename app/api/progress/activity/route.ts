import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { updateLastAccessed } from "@/lib/domains/progress/mutations";

const activitySchema = z.object({
  lesson_id: z.string().uuid("Invalid lesson ID"),
  cohort_id: z.string().uuid("Invalid cohort ID"),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await updateLastAccessed(
      auth.user.id,
      parsed.data.cohort_id,
      parsed.data.lesson_id
    );

    return NextResponse.json({ data: { tracked: true } }, { status: 200 });
  } catch (error) {
    console.error("POST /api/progress/activity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
