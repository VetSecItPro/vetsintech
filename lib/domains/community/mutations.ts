import { createClient } from "@/lib/supabase/server";
import type {
  Discussion,
  DiscussionPost,
  PostReaction,
  CreateDiscussionInput,
  UpdateDiscussionInput,
  CreatePostInput,
} from "./types";

// ============================================================================
// Discussion Mutations
// ============================================================================

export async function createDiscussion(
  organizationId: string,
  authorId: string,
  input: CreateDiscussionInput
): Promise<Discussion> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("discussions")
    .insert({
      organization_id: organizationId,
      author_id: authorId,
      title: input.title,
      body: input.body || null,
      cohort_id: input.cohort_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDiscussion(
  discussionId: string,
  organizationId: string,
  input: UpdateDiscussionInput
): Promise<Discussion> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.body !== undefined) payload.body = input.body;

  // Security: scope to organization to prevent cross-org mutation
  const { data, error } = await supabase
    .from("discussions")
    .update(payload)
    .eq("id", discussionId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDiscussion(
  discussionId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  // Security: scope to organization to prevent cross-org deletion
  const { error } = await supabase
    .from("discussions")
    .delete()
    .eq("id", discussionId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

export async function togglePin(discussionId: string): Promise<Discussion> {
  const supabase = await createClient();

  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from("discussions")
    .select("is_pinned")
    .eq("id", discussionId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("discussions")
    .update({ is_pinned: !current.is_pinned })
    .eq("id", discussionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleLock(discussionId: string): Promise<Discussion> {
  const supabase = await createClient();

  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from("discussions")
    .select("is_locked")
    .eq("id", discussionId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("discussions")
    .update({ is_locked: !current.is_locked })
    .eq("id", discussionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Post Mutations
// ============================================================================

export async function createPost(
  authorId: string,
  input: CreatePostInput
): Promise<DiscussionPost> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("discussion_posts")
    .insert({
      discussion_id: input.discussion_id,
      author_id: authorId,
      body: input.body,
      parent_post_id: input.parent_post_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePost(
  postId: string,
  authorId: string,
  body: Record<string, unknown>
): Promise<DiscussionPost> {
  const supabase = await createClient();

  // Security: scope to author to prevent editing others' posts
  const { data, error } = await supabase
    .from("discussion_posts")
    .update({ body })
    .eq("id", postId)
    .eq("author_id", authorId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(postId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("discussion_posts")
    .delete()
    .eq("id", postId);

  if (error) throw error;
}

// ============================================================================
// Reaction Mutations
// ============================================================================

export async function toggleReaction(
  postId: string,
  userId: string,
  reactionType: string = "upvote"
): Promise<PostReaction | null> {
  const supabase = await createClient();

  // Check if the reaction already exists
  const { data: existing, error: fetchError } = await supabase
    .from("post_reactions")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    // Remove the reaction
    const { error: deleteError } = await supabase
      .from("post_reactions")
      .delete()
      .eq("id", existing.id);

    if (deleteError) throw deleteError;
    return null;
  }

  // Create the reaction
  const { data, error: insertError } = await supabase
    .from("post_reactions")
    .insert({
      post_id: postId,
      user_id: userId,
      reaction_type: reactionType,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return data;
}

// ============================================================================
// Answer Mutations
// ============================================================================

export async function markAsAnswer(
  postId: string
): Promise<DiscussionPost> {
  const supabase = await createClient();

  // Fetch current state
  const { data: current, error: fetchError } = await supabase
    .from("discussion_posts")
    .select("is_answer")
    .eq("id", postId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("discussion_posts")
    .update({ is_answer: !current.is_answer })
    .eq("id", postId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
