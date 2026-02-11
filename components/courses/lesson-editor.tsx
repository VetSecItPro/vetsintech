"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
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
import { Switch } from "@/components/ui/switch";
import type { Lesson, LessonType } from "@/lib/domains/courses/types";

interface LessonEditorProps {
  courseId: string;
  moduleId: string;
  lesson: Lesson;
}

const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "video", label: "Video" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "resource", label: "Resource" },
];

export function LessonEditor({ courseId, moduleId, lesson }: LessonEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [lessonType, setLessonType] = useState<LessonType>(lesson.lesson_type);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || "");
  const [duration, setDuration] = useState(
    lesson.estimated_duration_minutes?.toString() || ""
  );
  const [isRequired, setIsRequired] = useState(lesson.is_required);
  const [content, setContent] = useState<Record<string, unknown> | null>(
    lesson.content
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            lesson_type: lessonType,
            video_url: videoUrl.trim() || null,
            estimated_duration_minutes: duration
              ? parseInt(duration, 10)
              : null,
            is_required: isRequired,
            content,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to save lesson");
      toast.success("Lesson saved");
    } catch {
      toast.error("Failed to save lesson");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Lesson"}
        </Button>
      </div>

      {/* Metadata */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lessonTitle">Title</Label>
          <Input
            id="lessonTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson title..."
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={lessonType}
            onValueChange={(v) => setLessonType(v as LessonType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LESSON_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min)</Label>
          <Input
            id="duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 15"
            min={1}
          />
        </div>
      </div>

      {/* Video URL (shown for video type) */}
      {lessonType === "video" && (
        <div className="space-y-2">
          <Label htmlFor="videoUrl">Video URL (YouTube or Vimeo)</Label>
          <Input
            id="videoUrl"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      )}

      {/* Required toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="isRequired"
          checked={isRequired}
          onCheckedChange={setIsRequired}
        />
        <Label htmlFor="isRequired" className="cursor-pointer">
          Required for course completion
        </Label>
      </div>

      {/* Rich text editor */}
      <div className="space-y-2">
        <Label>Content</Label>
        <TiptapEditor
          content={content}
          onChange={setContent}
          placeholder="Write your lesson content here..."
        />
      </div>
    </div>
  );
}
