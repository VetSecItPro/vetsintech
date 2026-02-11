import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { updatePost, deletePost, markAsAnswer } from "@/lib/domains/community/mutations";
import { z } from "zod/v4";

// ============================================================================
// PATCH /api/discussions/posts/[postId] — Update post body or mark as answer
// ============================================================================

const bodyUpdateSchema = z.object({
  body: z.record(z.string(), z.unknown()),
});

const markAnswerSchema = z.object({
  action: z.literal("mark_answer"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { postId } = await params;
  const body = await request.json();

  // Try mark as answer first (requires admin/instructor)
  const markResult = markAnswerSchema.safeParse(body);

  if (markResult.success) {
    // Re-check auth for admin/instructor role
    const adminAuth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(adminAuth)) return adminAuth;

    const post = await markAsAnswer(postId);
    return NextResponse.json({ data: post });
  }

  // Try body update
  const bodyResult = bodyUpdateSchema.safeParse(body);

  if (!bodyResult.success) {
    return NextResponse.json(
      { error: z.prettifyError(bodyResult.error) },
      { status: 400 }
    );
  }

  const post = await updatePost(postId, bodyResult.data.body);
  return NextResponse.json({ data: post });
}

// ============================================================================
// DELETE /api/discussions/posts/[postId] — Delete a post
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const auth = await requireAuth(request, ["admin", "instructor"]);
  if (isAuthError(auth)) return auth;

  const { postId } = await params;

  await deletePost(postId);

  return NextResponse.json({ data: { deleted: true } });
}
