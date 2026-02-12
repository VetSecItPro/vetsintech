import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getUserStreak } from "@/lib/domains/gamification/queries";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const streak = await getUserStreak(auth.user.id, auth.organizationId);

    return NextResponse.json(
      {
        data: streak ?? {
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/gamification/streak error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
