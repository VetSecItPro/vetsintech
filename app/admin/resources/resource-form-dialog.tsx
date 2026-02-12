"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ResourceWithCourse, ResourceType } from "@/lib/domains/resources/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "slide", label: "Slides" },
  { value: "document", label: "Document" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "video", label: "Video" },
  { value: "link", label: "Link" },
  { value: "repo", label: "Repository" },
  { value: "other", label: "Other" },
];

const LINK_TYPES: ResourceType[] = ["link", "repo", "video"];
const NO_COURSE = "__none__";

interface ResourceFormDialogProps {
  open: boolean;
  onClose: () => void;
  courses: { id: string; title: string }[];
  resource: ResourceWithCourse | null;
}

export function ResourceFormDialog({
  open,
  onClose,
  courses,
  resource,
}: ResourceFormDialogProps) {
  const router = useRouter();
  const isEditing = !!resource;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ResourceType>("document");
  const [externalUrl, setExternalUrl] = useState("");
  const [courseId, setCourseId] = useState<string>(NO_COURSE);
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description || "");
      setType(resource.type);
      setExternalUrl(resource.external_url || "");
      setCourseId(resource.course_id || NO_COURSE);
      setTagsInput(resource.tags.join(", "));
    } else {
      setTitle("");
      setDescription("");
      setType("document");
      setExternalUrl("");
      setCourseId(NO_COURSE);
      setTagsInput("");
    }
  }, [resource, open]);

  const isLinkType = LINK_TYPES.includes(type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      title,
      description: description || undefined,
      type,
      tags: tags.length > 0 ? tags : undefined,
      course_id: courseId !== NO_COURSE ? courseId : undefined,
    };

    if (isLinkType) {
      payload.external_url = externalUrl || undefined;
    }

    try {
      const url = isEditing
        ? `/api/resources/${resource.id}`
        : "/api/resources";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to ${isEditing ? "update" : "create"} resource`
        );
      }

      toast.success(
        `Resource ${isEditing ? "updated" : "created"} successfully`
      );
      onClose();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Operation failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Resource" : "Add Resource"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title"
              required
              minLength={2}
              maxLength={300}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the resource"
              rows={3}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as ResourceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Resource type" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL (for link/repo/video types) */}
          {isLinkType && (
            <div className="space-y-2">
              <Label htmlFor="external_url">URL</Label>
              <Input
                id="external_url"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {/* Course association */}
          <div className="space-y-2">
            <Label htmlFor="course">Course (optional)</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Org-wide (no course)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COURSE}>Org-wide (no course)</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. aws, networking, security"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Resource"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
