"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimePostsOptions {
  /** The discussion ID to subscribe to */
  discussionId: string;
  /** Optional: user ID to exclude own posts from the new-post count */
  currentUserId?: string;
}

interface UseRealtimePostsReturn {
  /** Number of new posts received since last reset */
  newPostCount: number;
  /** Reset the counter (e.g. after user clicks "load new replies") */
  resetCount: () => void;
}

/**
 * Subscribes to Supabase Realtime INSERT events on the `discussion_posts`
 * table for a specific discussion. Returns a count of new posts so the UI
 * can show a non-intrusive notification banner.
 */
export function useRealtimePosts({
  discussionId,
  currentUserId,
}: UseRealtimePostsOptions): UseRealtimePostsReturn {
  const [newPostCount, setNewPostCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const resetCount = useCallback(() => {
    setNewPostCount(0);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`discussion-${discussionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "vit",
          table: "discussion_posts",
          filter: `discussion_id=eq.${discussionId}`,
        },
        (payload) => {
          // Skip counting the current user's own posts — they already see
          // them after submitting the reply form.
          const newAuthorId = (payload.new as { author_id?: string })
            ?.author_id;
          if (currentUserId && newAuthorId === currentUserId) return;

          setNewPostCount((prev) => prev + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [discussionId, currentUserId]);

  return { newPostCount, resetCount };
}
