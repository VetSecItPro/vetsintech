import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getPostsByDiscussion } from "@/lib/domains/community/queries";
import { createPost } from "@/lib/domains/community/mutations";

/**
 * GET /api/discussions/[threadId]/posts
 * Get all posts for a discussion thread.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { threadId } = await params;
    const posts = await getPostsByDiscussion(threadId, auth.user.id);

    return NextResponse.json({ data: posts }, { status: 200 });
  } catch (error) {
    console.error("GET /api/discussions/[threadId]/posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const createPostSchema = z.object({
  body: z.record(z.string(), z.unknown()),
  parent_post_id: z.string().uuid("Invalid parent post ID").optional(),
});

/**
 * POST /api/discussions/[threadId]/posts
 * Create a reply post in a discussion thread.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { threadId } = await params;
    const rawBody = await request.json();
    const parsed = createPostSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const post = await createPost(auth.user.id, {
      discussion_id: threadId,
      body: parsed.data.body,
      parent_post_id: parsed.data.parent_post_id,
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/discussions/[threadId]/posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
