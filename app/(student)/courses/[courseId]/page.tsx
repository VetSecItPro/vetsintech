import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { ROUTES } from "@/lib/constants/routes";
import { getCourseWithModules } from "@/lib/domains/courses/queries";
import {
  getCourseProgress,
  getLessonCompletions,
  getEnrollmentForCourse,
} from "@/lib/domains/progress/queries";
import { ProgressRing } from "@/components/shared/progress-ring";
import {
  BookOpen,
  Check,
  Clock,
  FileText,
  FolderOpen,
  HelpCircle,
  Play,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LessonType } from "@/lib/domains/courses/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("title")
    .eq("id", courseId)
    .single();
  return { title: data?.title || "Course" };
}

const LESSON_TYPE_ICONS: Record<LessonType, typeof FileText> = {
  text: FileText,
  video: Video,
  quiz: HelpCircle,
  assignment: BookOpen,
  resource: FolderOpen,
};

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { user, organizationId } = await getAuthenticatedUser();

  // Fetch course with modules and lessons
  const course = await getCourseWithModules(courseId, organizationId);
  if (!course) notFound();

  // Find student's enrollment for this course (via cohort)
  const enrollmentData = await getEnrollmentForCourse(user.id, courseId);
  const cohortId = enrollmentData?.cohort_id;

  // Fetch progress if enrolled
  let progress: Awaited<ReturnType<typeof getCourseProgress>> = null;
  let completedLessonIds = new Set<string>();

  if (cohortId) {
    const [progressData, completions] = await Promise.all([
      getCourseProgress(user.id, cohortId),
      getLessonCompletions(user.id, cohortId),
    ]);
    progress = progressData;
    completedLessonIds = new Set(completions.map((c) => c.lesson_id));
  }

  // Calculate totals
  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );
  const totalDuration = course.modules.reduce(
    (sum, m) =>
      sum +
      m.lessons.reduce(
        (s, l) => s + (l.estimated_duration_minutes || 0),
        0
      ),
    0
  );

  // Find first incomplete lesson for "Continue" button
  let firstIncompleteLessonId: string | null = null;
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      if (!completedLessonIds.has(lesson.id)) {
        firstIncompleteLessonId = lesson.id;
        break;
      }
    }
    if (firstIncompleteLessonId) break;
  }

  // If all complete, use the last lesson or progress's last lesson
  const resumeLessonId =
    firstIncompleteLessonId ||
    progress?.last_lesson_id ||
    course.modules[0]?.lessons[0]?.id;

  return (
    <div className="space-y-8">
      {/* Course Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Thumbnail */}
        {course.thumbnail_url && (
          <div className="w-full shrink-0 overflow-hidden rounded-lg lg:w-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="aspect-video w-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 space-y-3">
          {course.category && (
            <span className="inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {course.category}
            </span>
          )}
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-slate-600 dark:text-slate-400">
              {course.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4" />
              {course.modules.length} module
              {course.modules.length !== 1 ? "s" : ""}
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {totalDuration >= 60
                  ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
                  : `${totalDuration}m`}
              </span>
            )}
          </div>

          {/* Progress + CTA */}
          <div className="flex items-center gap-4 pt-2">
            {progress && (
              <ProgressRing
                percentage={progress.progress_percentage}
                size={48}
              />
            )}
            {resumeLessonId && (
              <Button asChild>
                <Link href={ROUTES.lesson(courseId, resumeLessonId)}>
                  <Play className="mr-2 h-4 w-4" />
                  {progress && progress.progress_percentage > 0
                    ? "Continue Learning"
                    : "Start Course"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Stats Card */}
      {progress && (
        <Card>
          <CardContent className="flex flex-wrap gap-6 pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {Math.round(progress.progress_percentage)}%
              </p>
              <p className="text-xs text-slate-500">Complete</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {progress.completed_lessons}/{progress.total_lessons}
              </p>
              <p className="text-xs text-slate-500">Lessons</p>
            </div>
            {progress.started_at && (
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {new Date(progress.started_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-slate-500">Started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Module / Lesson List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Course Content</h2>

        {course.modules.map((mod, modIdx) => {
          const moduleLessonsDone = mod.lessons.filter((l) =>
            completedLessonIds.has(l.id)
          ).length;

          return (
            <Card key={mod.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <span className="text-slate-400">
                      Module {modIdx + 1}:
                    </span>{" "}
                    {mod.title}
                  </CardTitle>
                  <span className="text-xs text-slate-400">
                    {moduleLessonsDone}/{mod.lessons.length} complete
                  </span>
                </div>
                {mod.description && (
                  <p className="text-sm text-slate-500">{mod.description}</p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y">
                  {mod.lessons.map((lesson) => {
                    const isDone = completedLessonIds.has(lesson.id);
                    const Icon =
                      LESSON_TYPE_ICONS[lesson.lesson_type] || FileText;

                    return (
                      <li key={lesson.id}>
                        <Link
                          href={ROUTES.lesson(courseId, lesson.id)}
                          className={cn(
                            "flex items-center gap-3 px-2 py-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-900",
                            isDone && "text-slate-400"
                          )}
                        >
                          {isDone ? (
                            <Check className="h-4 w-4 shrink-0 text-green-500" />
                          ) : (
                            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="flex-1 truncate">
                            {lesson.title}
                          </span>
                          {lesson.estimated_duration_minutes && (
                            <span className="text-xs text-slate-400">
                              {lesson.estimated_duration_minutes}m
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
