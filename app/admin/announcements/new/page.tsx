"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Save } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function buildTiptapBody(text: string) {
    return {
      type: "doc",
      content: text
        .split("\n")
        .filter(Boolean)
        .map((line) => ({
          type: "paragraph",
          content: [{ type: "text", text: line }],
        })),
    };
  }

  function handleCreate(publish: boolean) {
    if (!title.trim() || !body.trim()) return;

    startTransition(async () => {
      try {
        // Create the announcement
        const createRes = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: buildTiptapBody(body),
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          throw new Error(err.error || "Failed to create announcement");
        }

        const { data } = await createRes.json();

        // Optionally publish immediately
        if (publish) {
          const publishRes = await fetch(`/api/announcements/${data.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "publish" }),
          });

          if (!publishRes.ok) {
            toast.warning("Announcement created but failed to publish");
          } else {
            toast.success("Announcement published!");
          }
        } else {
          toast.success("Announcement saved as draft");
        }

        router.push(ROUTES.adminAnnouncements);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Announcement
        </h1>
        <p className="text-sm text-slate-500">
          Create an announcement for your students
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="bg-slate-900 border-slate-700"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Content</Label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={8}
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleCreate(true)}
            disabled={isPending || !title.trim() || !body.trim()}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish Now
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCreate(false)}
            disabled={isPending || !title.trim() || !body.trim()}
          >
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
