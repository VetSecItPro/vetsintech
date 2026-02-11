"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";

interface LessonNavigationProps {
  courseId: string;
  previousLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
}

export function LessonNavigation({
  courseId,
  previousLesson,
  nextLesson,
}: LessonNavigationProps) {
  return (
    <div className="flex items-center justify-between border-t pt-6">
      {previousLesson ? (
        <Button variant="outline" asChild>
          <Link href={ROUTES.lesson(courseId, previousLesson.id)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{previousLesson.title}</span>
            <span className="sm:hidden">Previous</span>
          </Link>
        </Button>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <Button asChild>
          <Link href={ROUTES.lesson(courseId, nextLesson.id)}>
            <span className="hidden sm:inline">{nextLesson.title}</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link href={ROUTES.course(courseId)}>Back to Course</Link>
        </Button>
      )}
    </div>
  );
}
