import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getPortfolioProfile } from "@/lib/domains/portfolio/queries";
import { updatePortfolioProfile } from "@/lib/domains/portfolio/mutations";
import { updatePortfolioProfileSchema } from "@/lib/domains/portfolio/validation";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const profile = await getPortfolioProfile(auth.user.id);

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    console.error("GET /api/portfolio/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = updatePortfolioProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const profile = await updatePortfolioProfile(auth.user.id, parsed.data);

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/portfolio/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
