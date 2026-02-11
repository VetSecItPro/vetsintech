"use client";

import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressRing } from "@/components/shared/progress-ring";

export interface ContinueLearningItem {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  progress: number;
}

interface ContinueLearningProps {
  items: ContinueLearningItem[];
}

export function ContinueLearning({ items }: ContinueLearningProps) {
  if (items.length === 0) return null;

  const primary = items[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Continue Learning</CardTitle>
        <CardDescription>Pick up where you left off</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Primary — big CTA */}
        <Link
          href={ROUTES.lesson(primary.courseId, primary.lessonId)}
          className="group flex items-center gap-4 rounded-lg border bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400">
            <Play className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{primary.lessonTitle}</p>
            <p className="truncate text-xs text-slate-500">{primary.courseTitle}</p>
          </div>
          <ProgressRing percentage={primary.progress} size={36} strokeWidth={3} />
        </Link>

        {/* Secondary items */}
        {items.slice(1, 3).map((item) => (
          <Link
            key={item.courseId}
            href={ROUTES.lesson(item.courseId, item.lessonId)}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.lessonTitle}</p>
              <p className="truncate text-xs text-slate-400">{item.courseTitle}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          </Link>
        ))}

        {items.length > 3 && (
          <Button variant="ghost" size="sm" asChild className="w-full">
            <Link href={ROUTES.courses}>View all courses</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
