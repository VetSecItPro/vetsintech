"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

interface ReplyFormProps {
  discussionId: string;
  parentPostId?: string | null;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export function ReplyForm({
  discussionId,
  parentPostId,
  onSubmitted,
  onCancel,
}: ReplyFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) return;
    setError(null);

    // Build a simple Tiptap JSON doc from plain text
    const body = {
      type: "doc",
      content: content.split("\n").filter(Boolean).map((line) => ({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      })),
    };

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/discussions/${discussionId}/posts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              body,
              parent_post_id: parentPostId || null,
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to post reply");
        }

        setContent("");
        onSubmitted?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentPostId ? "Write a reply..." : "Share your thoughts..."}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={3}
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={handleSubmit} disabled={isPending || !content.trim()} size="sm">
          {isPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="mr-1 h-3.5 w-3.5" />
          )}
          {parentPostId ? "Reply" : "Post"}
        </Button>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
