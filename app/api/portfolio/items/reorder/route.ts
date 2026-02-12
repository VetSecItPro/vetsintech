import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { reorderPortfolioItems } from "@/lib/domains/portfolio/mutations";
import { reorderPortfolioItemsSchema } from "@/lib/domains/portfolio/validation";

/**
 * PUT /api/portfolio/items/reorder — reorder portfolio items
 */
export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = reorderPortfolioItemsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    await reorderPortfolioItems(auth.user.id, parsed.data.items);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/portfolio/items/reorder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
