import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";
import { getDiscussionWithPosts } from "@/lib/domains/community/queries";
import { updateDiscussion } from "@/lib/domains/community/mutations";
import { z } from "zod/v4";

// ============================================================================
// GET /api/discussions/[threadId] — Fetch a single discussion with posts
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { threadId } = await params;

  const discussion = await getDiscussionWithPosts(threadId, auth.user.id);

  if (!discussion) {
    return NextResponse.json(
      { error: "Discussion not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: discussion });
}

// ============================================================================
// PATCH /api/discussions/[threadId] — Moderation actions or content updates
// ============================================================================

const moderationSchema = z.object({
  action: z.enum(["pin", "unpin", "lock", "unlock"]),
});

const contentUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.unknown().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAuth(request, ["admin", "instructor"]);
  if (isAuthError(auth)) return auth;

  const { organizationId } = auth;
  const { threadId } = await params;

  const body = await request.json();
  const moderationResult = moderationSchema.safeParse(body);

  if (moderationResult.success) {
    const { action } = moderationResult.data;

    const updateFields: Record<string, boolean> = {};

    switch (action) {
      case "pin":
        updateFields.is_pinned = true;
        break;
      case "unpin":
        updateFields.is_pinned = false;
        break;
      case "lock":
        updateFields.is_locked = true;
        break;
      case "unlock":
        updateFields.is_locked = false;
        break;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("discussions")
      .update(updateFields)
      .eq("id", threadId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Discussion not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } else {
    // Try content update
    const contentResult = contentUpdateSchema.safeParse(body);

    if (!contentResult.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const discussion = await updateDiscussion(
      threadId,
      organizationId,
      contentResult.data as { title?: string; body?: Record<string, unknown> }
    );

    return NextResponse.json({ data: discussion });
  }
}

// ============================================================================
// DELETE /api/discussions/[threadId] — Delete a discussion and its posts
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAuth(request, ["admin", "instructor"]);
  if (isAuthError(auth)) return auth;

  const { organizationId } = auth;
  const { threadId } = await params;

  const supabase = await createClient();

  // Delete all posts belonging to this discussion first
  await supabase
    .from("posts")
    .delete()
    .eq("discussion_id", threadId);

  // Delete the discussion
  const { error } = await supabase
    .from("discussions")
    .delete()
    .eq("id", threadId)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json(
      { error: "Discussion not found or delete failed" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { deleted: true } });
}
