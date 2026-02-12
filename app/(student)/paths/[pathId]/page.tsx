"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Layers,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LearningPath } from "@/lib/domains/learning-paths/types";

interface PathCourseData {
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  estimated_duration_minutes: number | null;
  position: number;
  is_required: boolean;
  progress_percentage: number;
  is_completed: boolean;
}

interface PathDetailData {
  path: LearningPath;
  courses: PathCourseData[];
  overall_percentage: number;
  is_enrolled: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  intermediate:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

interface PathDetailPageProps {
  params: Promise<{ pathId: string }>;
}

export default function PathDetailPage({ params }: PathDetailPageProps) {
  const { pathId } = use(params);
  const [data, setData] = useState<PathDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPath() {
      try {
        // Fetch path details
        const pathRes = await fetch(`/api/paths/${pathId}`);
        if (pathRes.status === 404) {
          setNotFound(true);
          return;
        }
        if (!pathRes.ok) throw new Error("Failed to fetch path");
        const pathBody = await pathRes.json();

        // Fetch courses in path
        const coursesRes = await fetch(`/api/paths/${pathId}/courses`);
        if (!coursesRes.ok) throw new Error("Failed to fetch path courses");
        const coursesBody = await coursesRes.json();

        // Build course data with basic info (progress will need a separate call in a full implementation)
        const courses: PathCourseData[] = (coursesBody.data || []).map(
          (pc: {
            course_id: string;
            position: number;
            is_required: boolean;
            course: {
              id: string;
              title: string;
              slug: string;
              description: string | null;
              thumbnail_url: string | null;
              estimated_duration_minutes: number | null;
            };
          }) => ({
            course_id: pc.course_id,
            title: pc.course.title,
            slug: pc.course.slug,
            description: pc.course.description,
            thumbnail_url: pc.course.thumbnail_url,
            estimated_duration_minutes: pc.course.estimated_duration_minutes,
            position: pc.position,
            is_required: pc.is_required,
            progress_percentage: 0,
            is_completed: false,
          })
        );

        setData({
          path: pathBody.data,
          courses,
          overall_percentage: 0,
          is_enrolled: false, // Will be determined by enrollment check below
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load learning path";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPath();
  }, [pathId]);

  async function handleEnroll() {
    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/paths/${pathId}/enroll`, {
        method: "POST",
      });

      if (res.status === 409) {
        toast.info("Already enrolled in this learning path");
        setData((prev) => (prev ? { ...prev, is_enrolled: true } : prev));
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to enroll");
      }

      toast.success("Enrolled successfully!");
      setData((prev) => (prev ? { ...prev, is_enrolled: true } : prev));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enroll";
      toast.error(message);
    } finally {
      setIsEnrolling(false);
    }
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.paths}>
            <ArrowLeft />
            Back to Learning Paths
          </Link>
        </Button>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-lg font-semibold">Learning Path Not Found</h2>
          <p className="text-muted-foreground">
            The learning path you are looking for does not exist or you do not
            have access.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.paths}>
            <ArrowLeft />
            Back to Learning Paths
          </Link>
        </Button>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { path, courses, overall_percentage, is_enrolled } = data;

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={ROUTES.paths}>
          <ArrowLeft />
          Back to Learning Paths
        </Link>
      </Button>

      {/* Path Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {path.thumbnail_url && (
          <div className="w-full shrink-0 overflow-hidden rounded-lg lg:w-72">
            <Image
              src={path.thumbnail_url}
              alt={path.title}
              width={288}
              height={162}
              className="aspect-video w-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            {path.difficulty_level && (
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[path.difficulty_level] || ""}`}
              >
                {path.difficulty_level}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            {path.title}
          </h1>
          {path.description && (
            <p className="text-slate-600 dark:text-slate-400">
              {path.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {courses.length} course{courses.length !== 1 ? "s" : ""}
            </span>
            {path.estimated_hours && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {path.estimated_hours}h estimated
              </span>
            )}
          </div>

          {path.tags && path.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {path.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Enroll / Progress */}
          <div className="flex items-center gap-4 pt-2">
            {is_enrolled ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>{overall_percentage}% complete</span>
                </div>
                <div className="h-2 w-48 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: `${Math.min(overall_percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <Button onClick={handleEnroll} disabled={isEnrolling}>
                <Layers className="mr-2 h-4 w-4" />
                {isEnrolling ? "Enrolling..." : "Enroll in Path"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Courses in This Path</h2>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-12">
            <BookOpen className="h-10 w-10 text-slate-600" />
            <p className="mt-3 font-medium text-slate-400">
              No courses added yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course, index) => {
              // A course is "locked" if the previous required course is not completed
              const prevCourse = index > 0 ? courses[index - 1] : null;
              const isLocked =
                prevCourse &&
                prevCourse.is_required &&
                !prevCourse.is_completed &&
                is_enrolled;

              return (
                <Card
                  key={course.course_id}
                  className={cn(isLocked && "opacity-60")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-medium text-slate-300">
                          {course.is_completed ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : isLocked ? (
                            <Lock className="h-4 w-4 text-slate-500" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {isLocked ? (
                              <span className="text-slate-500">
                                {course.title}
                              </span>
                            ) : (
                              <Link
                                href={ROUTES.course(course.course_id)}
                                className="hover:text-indigo-400 transition-colors"
                              >
                                {course.title}
                              </Link>
                            )}
                          </CardTitle>
                          {course.description && (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {!course.is_required && (
                          <Badge variant="outline" className="text-[10px]">
                            Optional
                          </Badge>
                        )}
                        {course.estimated_duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(course.estimated_duration_minutes / 60)}h
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {is_enrolled && (
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {Math.round(course.progress_percentage)}% complete
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{
                            width: `${Math.min(course.progress_percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
