"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AnnouncementActionsProps {
  announcementId: string;
  isPublished: boolean;
}

export function AnnouncementActions({
  announcementId,
  isPublished,
}: AnnouncementActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handlePublishToggle() {
    startTransition(async () => {
      try {
        const action = isPublished ? "unpublish" : "publish";
        const res = await fetch(`/api/announcements/${announcementId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (res.ok) {
          toast.success(
            isPublished
              ? "Announcement unpublished"
              : "Announcement published"
          );
          router.refresh();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to update announcement");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/announcements/${announcementId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          toast.success("Announcement deleted");
          router.refresh();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to delete announcement");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handlePublishToggle}
        disabled={isPending}
        title={isPublished ? "Unpublish" : "Publish"}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPublished ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-400"
        onClick={handleDelete}
        disabled={isPending}
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
