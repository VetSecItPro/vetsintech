"use client";

import Link from "next/link";
import { Check, ChevronDown, ChevronRight, FileText, Video, HelpCircle, BookOpen, FolderOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";
import type { ModuleWithLessons, LessonType } from "@/lib/domains/courses/types";

interface LessonSidebarProps {
  courseId: string;
  courseTitle: string;
  modules: ModuleWithLessons[];
  currentLessonId: string;
  completedLessonIds: Set<string>;
  progress: number;
}

const LESSON_ICONS: Record<LessonType, typeof FileText> = {
  text: FileText,
  video: Video,
  quiz: HelpCircle,
  assignment: BookOpen,
  resource: FolderOpen,
};

export function LessonSidebar({
  courseId,
  courseTitle,
  modules,
  currentLessonId,
  completedLessonIds,
  progress,
}: LessonSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    // Auto-expand the module containing the current lesson
    const moduleWithCurrent = modules.find((m) =>
      m.lessons.some((l) => l.id === currentLessonId)
    );
    return new Set(moduleWithCurrent ? [moduleWithCurrent.id] : modules.map((m) => m.id));
  });

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Course title + progress */}
      <div className="border-b p-4">
        <Link
          href={ROUTES.course(courseId)}
          className="text-sm font-semibold hover:underline"
        >
          {courseTitle}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Module/lesson tree */}
      <nav className="flex-1 overflow-y-auto py-2">
        {modules.map((mod, idx) => (
          <div key={mod.id}>
            <button
              onClick={() => toggleModule(mod.id)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {expandedModules.has(mod.id) ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <span className="truncate">
                {idx + 1}. {mod.title}
              </span>
            </button>

            {expandedModules.has(mod.id) && (
              <ul className="pb-1">
                {mod.lessons.map((lesson) => {
                  const isActive = lesson.id === currentLessonId;
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const Icon = LESSON_ICONS[lesson.lesson_type] || FileText;

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={ROUTES.lesson(courseId, lesson.id)}
                        className={cn(
                          "flex items-center gap-2 px-6 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                        ) : (
                          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
