import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { updatePortfolioItem, deletePortfolioItem } from "@/lib/domains/portfolio/mutations";
import { updatePortfolioItemSchema } from "@/lib/domains/portfolio/validation";

/**
 * PATCH /api/portfolio/items/[itemId] — update a portfolio item
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { itemId } = await params;
    const body = await request.json();
    const parsed = updatePortfolioItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const item = await updatePortfolioItem(itemId, auth.user.id, parsed.data);

    return NextResponse.json({ data: item }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/portfolio/items/[itemId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/portfolio/items/[itemId] — delete a portfolio item
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { itemId } = await params;
    await deletePortfolioItem(itemId, auth.user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/portfolio/items/[itemId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
