"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pin, Lock, Unlock, Trash2, PinOff } from "lucide-react";
import { toast } from "sonner";

interface DiscussionModActionsProps {
  discussionId: string;
  isPinned: boolean;
  isLocked: boolean;
}

export function DiscussionModActions({
  discussionId,
  isPinned,
  isLocked,
}: DiscussionModActionsProps) {
  const router = useRouter();
  const [pinPending, startPinTransition] = useTransition();
  const [lockPending, startLockTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  async function handlePin() {
    startPinTransition(async () => {
      const action = isPinned ? "unpin" : "pin";
      try {
        const res = await fetch(`/api/discussions/${discussionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to update discussion");
        }

        toast.success(
          isPinned ? "Discussion unpinned" : "Discussion pinned"
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update discussion"
        );
      }
    });
  }

  async function handleLock() {
    startLockTransition(async () => {
      const action = isLocked ? "unlock" : "lock";
      try {
        const res = await fetch(`/api/discussions/${discussionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to update discussion");
        }

        toast.success(
          isLocked ? "Discussion unlocked" : "Discussion locked"
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update discussion"
        );
      }
    });
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this discussion? This will also delete all replies and cannot be undone."
    );
    if (!confirmed) return;

    startDeleteTransition(async () => {
      try {
        const res = await fetch(`/api/discussions/${discussionId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to delete discussion");
        }

        toast.success("Discussion deleted");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete discussion"
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePin}
        disabled={pinPending}
        className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
        title={isPinned ? "Unpin discussion" : "Pin discussion"}
      >
        {isPinned ? (
          <PinOff className="h-4 w-4" />
        ) : (
          <Pin className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleLock}
        disabled={lockPending}
        className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
        title={isLocked ? "Unlock discussion" : "Lock discussion"}
      >
        {isLocked ? (
          <Unlock className="h-4 w-4" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={deletePending}
        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
        title="Delete discussion"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
