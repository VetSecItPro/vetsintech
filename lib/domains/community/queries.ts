import { createClient } from "@/lib/supabase/server";
import type {
  DiscussionWithAuthor,
  DiscussionWithPosts,
  PostWithAuthor,
  PostReaction,
  DiscussionFilters,
} from "./types";

// ============================================================================
// Discussion Queries
// ============================================================================

export async function getDiscussions(
  organizationId: string,
  filters?: DiscussionFilters
): Promise<DiscussionWithAuthor[]> {
  const supabase = await createClient();

  let query = supabase
    .from("discussions")
    .select(
      `
      *,
      author:profiles!inner(id, full_name, email)
    `
    )
    .eq("organization_id", organizationId)
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false });

  if (filters?.cohort_id) {
    query = query.eq("cohort_id", filters.cohort_id);
  }
  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }
  if (filters?.pinned !== undefined) {
    query = query.eq("is_pinned", filters.pinned);
  }

  const limit = filters?.limit ?? 25;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((d) => ({
    ...d,
    author: d.author as unknown as DiscussionWithAuthor["author"],
  }));
}

export async function getDiscussionById(
  discussionId: string
): Promise<DiscussionWithAuthor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("discussions")
    .select(
      `
      *,
      author:profiles!inner(id, full_name, email)
    `
    )
    .eq("id", discussionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    author: data.author as unknown as DiscussionWithAuthor["author"],
  };
}

export async function getDiscussionWithPosts(
  discussionId: string,
  userId: string
): Promise<DiscussionWithPosts | null> {
  const discussion = await getDiscussionById(discussionId);
  if (!discussion) return null;

  const posts = await getPostsByDiscussion(discussionId, userId);

  return {
    ...discussion,
    posts,
  };
}

// ============================================================================
// Post Queries
// ============================================================================

export async function getPostsByDiscussion(
  discussionId: string,
  userId: string
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("discussion_posts")
    .select(
      `
      *,
      author:profiles!inner(id, full_name, email),
      post_reactions(user_id, reaction_type)
    `
    )
    .eq("discussion_id", discussionId)
    .order("parent_post_id", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((post) => {
    const reactions = (
      post.post_reactions as unknown as {
        user_id: string;
        reaction_type: string;
      }[]
    ) || [];
    const userHasUpvoted = reactions.some(
      (r) => r.user_id === userId && r.reaction_type === "upvote"
    );

    return {
      ...post,
      author: post.author as unknown as PostWithAuthor["author"],
      user_has_upvoted: userHasUpvoted,
    };
  });
}

// ============================================================================
// Reaction Queries
// ============================================================================

export async function getUserReaction(
  postId: string,
  userId: string
): Promise<PostReaction | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("post_reactions")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
