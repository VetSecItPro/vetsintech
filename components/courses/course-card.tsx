"use client";

import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";
import { ProgressRing } from "@/components/shared/progress-ring";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  courseId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  progress: number; // 0-100
  totalLessons: number;
  completedLessons: number;
  estimatedMinutes?: number | null;
  lastAccessedAt?: string | null;
}

export function CourseCard({
  courseId,
  title,
  description,
  category,
  progress,
  totalLessons,
  completedLessons,
  estimatedMinutes,
}: CourseCardProps) {
  return (
    <Link href={ROUTES.course(courseId)}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-tight line-clamp-2">
                {title}
              </CardTitle>
              {category && (
                <Badge variant="secondary" className="mt-1.5 text-xs">
                  {category}
                </Badge>
              )}
            </div>
            <ProgressRing percentage={progress} size={44} strokeWidth={3.5} />
          </div>
          {description && (
            <CardDescription className="line-clamp-2 mt-1">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {completedLessons}/{totalLessons} lessons
            </span>
            {estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {estimatedMinutes >= 60
                  ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
                  : `${estimatedMinutes}m`}
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress === 100
                  ? "bg-green-500"
                  : progress >= 50
                    ? "bg-blue-500"
                    : "bg-amber-500"
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

