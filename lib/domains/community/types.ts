// ============================================================================
// Community Discussion Domain Types
// Maps to: discussions, discussion_posts, post_reactions tables
// ============================================================================

// ---------- Core Entities ----------

export interface Discussion {
  id: string;
  organization_id: string;
  cohort_id: string | null;
  title: string;
  body: Record<string, unknown> | null; // Tiptap JSON
  author_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscussionPost {
  id: string;
  discussion_id: string;
  parent_post_id: string | null;
  author_id: string;
  body: Record<string, unknown>; // Tiptap JSON
  upvote_count: number;
  is_answer: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

// ---------- Joined / Extended Types ----------

export interface DiscussionWithAuthor extends Discussion {
  author: { id: string; full_name: string; email: string };
}

export interface PostWithAuthor extends DiscussionPost {
  author: { id: string; full_name: string; email: string };
  user_has_upvoted: boolean;
}

export interface DiscussionWithPosts extends DiscussionWithAuthor {
  posts: PostWithAuthor[];
}

// ---------- Input Types (for create/update) ----------

export interface CreateDiscussionInput {
  title: string;
  body?: Record<string, unknown>;
  cohort_id?: string;
}

export interface UpdateDiscussionInput {
  title?: string;
  body?: Record<string, unknown>;
}

export interface CreatePostInput {
  discussion_id: string;
  body: Record<string, unknown>;
  parent_post_id?: string;
}

// ---------- Filter / Query Types ----------

export interface DiscussionFilters {
  cohort_id?: string;
  search?: string;
  pinned?: boolean;
  limit?: number;
  offset?: number;
}
