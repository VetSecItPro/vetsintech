"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Save } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";

interface Cohort {
  id: string;
  name: string;
}

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cohortId, setCohortId] = useState<string>("");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchCohorts() {
      try {
        const res = await fetch("/api/cohorts");
        if (res.ok) {
          const { data } = await res.json();
          setCohorts(data || []);
        }
      } catch {
        // Cohort loading is optional; silently fail
      }
    }
    fetchCohorts();
  }, []);

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
        const payload: Record<string, unknown> = {
          title: title.trim(),
          body: buildTiptapBody(body),
        };
        if (cohortId && cohortId !== "all") {
          payload.cohort_id = cohortId;
        }

        // Create the announcement
        const createRes = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
          <Label htmlFor="cohort">Cohort (optional)</Label>
          <Select value={cohortId} onValueChange={setCohortId}>
            <SelectTrigger className="bg-slate-900 border-slate-700">
              <SelectValue placeholder="All students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              {cohorts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-600">
            Leave as &quot;All students&quot; to send to everyone
          </p>
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
