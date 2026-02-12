import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getPortfolioItems } from "@/lib/domains/portfolio/queries";
import { createPortfolioItem } from "@/lib/domains/portfolio/mutations";
import { createPortfolioItemSchema } from "@/lib/domains/portfolio/validation";

/**
 * GET /api/portfolio/items — get own portfolio items
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const items = await getPortfolioItems(auth.user.id);

    return NextResponse.json({ data: items }, { status: 200 });
  } catch (error) {
    console.error("GET /api/portfolio/items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolio/items — create a new portfolio item
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createPortfolioItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const item = await createPortfolioItem(auth.user.id, parsed.data);

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/portfolio/items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
