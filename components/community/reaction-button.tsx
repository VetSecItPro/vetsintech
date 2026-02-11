"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReactionButtonProps {
  postId: string;
  initialCount: number;
  initialHasUpvoted: boolean;
}

export function ReactionButton({
  postId,
  initialCount,
  initialHasUpvoted,
}: ReactionButtonProps) {
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    // Optimistic update
    const newUpvoted = !hasUpvoted;
    setHasUpvoted(newUpvoted);
    setCount((c) => c + (newUpvoted ? 1 : -1));

    startTransition(async () => {
      try {
        const res = await fetch("/api/discussions/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: postId,
            reaction_type: "upvote",
          }),
        });

        if (!res.ok) {
          // Revert on failure
          setHasUpvoted(!newUpvoted);
          setCount((c) => c + (newUpvoted ? -1 : 1));
        }
      } catch {
        // Revert on error
        setHasUpvoted(!newUpvoted);
        setCount((c) => c + (newUpvoted ? -1 : 1));
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
        hasUpvoted
          ? "bg-blue-950 text-blue-400"
          : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
      )}
    >
      <ThumbsUp className="h-3.5 w-3.5" />
      {count > 0 && count}
    </button>
  );
}
