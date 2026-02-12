import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { checkUsernameAvailable } from "@/lib/domains/portfolio/queries";
import { claimUsername } from "@/lib/domains/portfolio/mutations";
import { claimUsernameSchema } from "@/lib/domains/portfolio/validation";

/**
 * GET /api/portfolio/username?username=xxx — check username availability
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username query parameter is required" },
        { status: 400 }
      );
    }

    const parsed = claimUsernameSchema.safeParse({ username });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid username", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const available = await checkUsernameAvailable(parsed.data.username);

    return NextResponse.json({ available, username: parsed.data.username }, { status: 200 });
  } catch (error) {
    console.error("GET /api/portfolio/username error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolio/username — claim a username (requires auth)
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = claimUsernameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const profile = await claimUsername(auth.user.id, parsed.data.username);

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Username is already taken") {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
    console.error("POST /api/portfolio/username error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
