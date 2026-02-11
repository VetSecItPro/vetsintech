"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Module, Lesson } from "@/lib/domains/courses/types";

interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

interface ModuleListProps {
  courseId: string;
  modules: ModuleWithLessons[];
}

const LESSON_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  video: "Video",
  quiz: "Quiz",
  assignment: "Assignment",
  resource: "Resource",
};

export function ModuleList({ courseId, modules: initialModules }: ModuleListProps) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(initialModules.map((m) => m.id))
  );
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [isAddingLesson, setIsAddingLesson] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  async function handleAddModule() {
    if (!newModuleTitle.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newModuleTitle.trim(),
          description: newModuleDesc.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create module");
      const { data } = await res.json();
      setModules((prev) => [...prev, { ...data, lessons: [] }]);
      setExpandedModules((prev) => new Set([...prev, data.id]));
      setNewModuleTitle("");
      setNewModuleDesc("");
      setIsAddingModule(false);
      toast.success("Module created");
    } catch {
      toast.error("Failed to create module");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteModule(moduleId: string) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete module");
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      toast.success("Module deleted");
    } catch {
      toast.error("Failed to delete module");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddLesson(moduleId: string) {
    if (!newLessonTitle.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newLessonTitle.trim() }),
        }
      );
      if (!res.ok) throw new Error("Failed to create lesson");
      const { data } = await res.json();
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, lessons: [...m.lessons, data] } : m
        )
      );
      setNewLessonTitle("");
      setIsAddingLesson(null);
      toast.success("Lesson created");
    } catch {
      toast.error("Failed to create lesson");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLesson(moduleId: string, lessonId: string) {
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete lesson");
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
            : m
        )
      );
      toast.success("Lesson deleted");
    } catch {
      toast.error("Failed to delete lesson");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {modules.map((mod, idx) => (
        <div key={mod.id} className="rounded-lg border bg-white dark:bg-slate-950">
          {/* Module header */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-slate-400" />
            <button
              onClick={() => toggleModule(mod.id)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              {expandedModules.has(mod.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="text-xs font-medium text-slate-400">
                Module {idx + 1}
              </span>
              <span className="font-medium">{mod.title}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
              </Badge>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-700"
              onClick={() => handleDeleteModule(mod.id)}
              disabled={isSaving}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Lessons (collapsible) */}
          {expandedModules.has(mod.id) && (
            <div className="px-4 py-2">
              {mod.lessons.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  No lessons yet. Add one below.
                </p>
              )}
              {mod.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <GripVertical className="h-3.5 w-3.5 cursor-grab text-slate-300" />
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="flex-1 text-sm">{lesson.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {LESSON_TYPE_LABELS[lesson.lesson_type] || lesson.lesson_type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() =>
                      router.push(
                        ROUTES.adminEditLesson(courseId, lesson.id)
                      )
                    }
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {/* Add lesson inline */}
              {isAddingLesson === mod.id ? (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    placeholder="Lesson title..."
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddLesson(mod.id);
                      if (e.key === "Escape") setIsAddingLesson(null);
                    }}
                    autoFocus
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddLesson(mod.id)}
                    disabled={isSaving || !newLessonTitle.trim()}
                    className="h-8"
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingLesson(null)}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-8 w-full justify-start text-slate-500"
                  onClick={() => {
                    setIsAddingLesson(mod.id);
                    setNewLessonTitle("");
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add lesson
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add module */}
      <Dialog open={isAddingModule} onOpenChange={setIsAddingModule}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="moduleTitle">Title</Label>
              <Input
                id="moduleTitle"
                placeholder="e.g., Introduction to Networking"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moduleDesc">Description (optional)</Label>
              <Textarea
                id="moduleDesc"
                placeholder="Brief description of this module..."
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddModule}
              disabled={isSaving || !newModuleTitle.trim()}
            >
              {isSaving ? "Creating..." : "Create Module"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
