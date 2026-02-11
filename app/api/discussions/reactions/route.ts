import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { toggleReaction } from "@/lib/domains/community/mutations";

const reactionSchema = z.object({
  post_id: z.uuid(),
  reaction_type: z.enum(["upvote"]).default("upvote"),
});

/**
 * POST /api/discussions/reactions
 * Toggle a reaction on a discussion post.
 * Returns { data: { action: "added" | "removed" } }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = reactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const reaction = await toggleReaction(
      parsed.data.post_id,
      auth.user.id,
      parsed.data.reaction_type
    );

    return NextResponse.json(
      { data: { action: reaction ? "added" : "removed" } },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/discussions/reactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
