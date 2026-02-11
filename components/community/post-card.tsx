"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, MessageSquare, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostAuthor {
  id: string;
  full_name: string;
}

interface PostCardProps {
  postId: string;
  body: Record<string, unknown>;
  author: PostAuthor;
  createdAt: string;
  upvoteCount: number;
  isAnswer: boolean;
  hasUpvoted: boolean;
  isLocked?: boolean;
  depth?: number;
  onReply?: (postId: string) => void;
  renderContent: (body: Record<string, unknown>) => React.ReactNode;
}

export function PostCard({
  postId,
  body,
  author,
  createdAt,
  upvoteCount,
  isAnswer,
  hasUpvoted,
  isLocked,
  depth = 0,
  onReply,
  renderContent,
}: PostCardProps) {
  const [upvoted, setUpvoted] = useState(hasUpvoted);
  const [count, setCount] = useState(upvoteCount);
  const [isPending, startTransition] = useTransition();

  function handleUpvote() {
    if (isLocked) return;

    // Optimistic update
    const newUpvoted = !upvoted;
    setUpvoted(newUpvoted);
    setCount((c) => c + (newUpvoted ? 1 : -1));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/discussions/posts/${postId}/react`, {
          method: "POST",
        });
        if (!res.ok) {
          // Revert on failure
          setUpvoted(!newUpvoted);
          setCount((c) => c + (newUpvoted ? -1 : 1));
        }
      } catch {
        setUpvoted(!newUpvoted);
        setCount((c) => c + (newUpvoted ? -1 : 1));
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isAnswer && "border-green-500/30 bg-green-950/20",
        depth > 0 && "ml-8 border-l-2 border-l-slate-700"
      )}
    >
      {/* Author + time */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-medium">
          {author.full_name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium">{author.full_name}</span>
        <span className="text-slate-500">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </span>
        {isAnswer && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <CheckCircle className="h-3 w-3" />
            Accepted Answer
          </span>
        )}
      </div>

      {/* Content */}
      <div className="mt-3">{renderContent(body)}</div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleUpvote}
          disabled={isPending || isLocked}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
            upvoted
              ? "bg-blue-950 text-blue-400"
              : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {count > 0 && count}
        </button>

        {!isLocked && onReply && (
          <button
            onClick={() => onReply(postId)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Reply
          </button>
        )}
      </div>
    </div>
  );
}
