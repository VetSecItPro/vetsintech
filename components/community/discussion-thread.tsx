"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscussionWithAuthor, PostWithAuthor } from "@/lib/domains/community/types";
import { PostCard } from "./post-card";
import { ReplyForm } from "./reply-form";
import { TiptapContent } from "./tiptap-content";

interface DiscussionThreadProps {
  discussion: DiscussionWithAuthor;
  posts: PostWithAuthor[];
  isLocked: boolean;
}

export function DiscussionThread({
  discussion,
  posts,
  isLocked,
}: DiscussionThreadProps) {
  const router = useRouter();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Separate top-level posts from nested replies
  const topLevelPosts = posts.filter((p) => !p.parent_post_id);
  const repliesMap = new Map<string, PostWithAuthor[]>();
  for (const post of posts) {
    if (post.parent_post_id) {
      const existing = repliesMap.get(post.parent_post_id) || [];
      existing.push(post);
      repliesMap.set(post.parent_post_id, existing);
    }
  }

  function renderContent(body: Record<string, unknown>) {
    return <TiptapContent content={body} />;
  }

  function handleReply(postId: string) {
    setReplyingTo(replyingTo === postId ? null : postId);
  }

  function handleSubmitted() {
    setReplyingTo(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Discussion body (OP content) */}
      {discussion.body && (
        <div className="rounded-lg border border-slate-800 p-4">
          <TiptapContent content={discussion.body} />
        </div>
      )}

      {/* Reply form for top-level replies */}
      {!isLocked && (
        <div className="rounded-lg border border-slate-800 p-4">
          <ReplyForm
            discussionId={discussion.id}
            onSubmitted={handleSubmitted}
          />
        </div>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {topLevelPosts.map((post) => (
          <div key={post.id} className="space-y-3">
            <PostCard
              postId={post.id}
              body={post.body}
              author={post.author}
              createdAt={post.created_at}
              upvoteCount={post.upvote_count}
              isAnswer={post.is_answer}
              hasUpvoted={post.user_has_upvoted}
              isLocked={isLocked}
              onReply={handleReply}
              renderContent={renderContent}
            />

            {/* Inline reply form */}
            {replyingTo === post.id && (
              <div className="ml-8">
                <ReplyForm
                  discussionId={discussion.id}
                  parentPostId={post.id}
                  onSubmitted={handleSubmitted}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}

            {/* Nested replies */}
            {repliesMap.get(post.id)?.map((reply) => (
              <PostCard
                key={reply.id}
                postId={reply.id}
                body={reply.body}
                author={reply.author}
                createdAt={reply.created_at}
                upvoteCount={reply.upvote_count}
                isAnswer={reply.is_answer}
                hasUpvoted={reply.user_has_upvoted}
                isLocked={isLocked}
                depth={1}
                renderContent={renderContent}
              />
            ))}
          </div>
        ))}
      </div>

      {topLevelPosts.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700 py-10 text-center text-sm text-slate-500">
          No replies yet. Be the first to respond!
        </div>
      )}
    </div>
  );
}
