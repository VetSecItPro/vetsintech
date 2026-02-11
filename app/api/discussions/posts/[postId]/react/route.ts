import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { toggleReaction } from "@/lib/domains/community/mutations";

/**
 * POST /api/discussions/posts/[postId]/react
 * Toggle an upvote reaction on a post. No request body needed.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { postId } = await params;
    const reaction = await toggleReaction(postId, auth.user.id);

    return NextResponse.json(
      { data: reaction, toggled: reaction !== null },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/discussions/posts/[postId]/react error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
