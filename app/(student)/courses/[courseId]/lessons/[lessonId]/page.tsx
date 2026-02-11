import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { getCourseWithModules, getLessonById } from "@/lib/domains/courses/queries";
import {
  getCourseProgress,
  getLessonCompletions,
  isLessonCompleted,
} from "@/lib/domains/progress/queries";
import { updateLastAccessed } from "@/lib/domains/progress/mutations";
import { getNextLesson, getPreviousLesson } from "@/lib/domains/progress/utils";
import { LessonContent } from "@/components/courses/lesson-content";
import { LessonSidebar } from "@/components/courses/lesson-sidebar";
import { LessonNavigation } from "@/components/courses/lesson-navigation";
import { MarkCompleteButton } from "@/components/courses/mark-complete-button";
import { VideoPlayer } from "@/components/courses/video-player";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);
  return { title: lesson?.title || "Lesson" };
}

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect(ROUTES.login);

  // Fetch lesson and full course structure in parallel
  const [lesson, course] = await Promise.all([
    getLessonById(lessonId),
    getCourseWithModules(courseId, profile.organization_id),
  ]);

  if (!lesson || !course) notFound();

  // Find student's enrollment cohort for this course
  const { data: enrollmentData } = await supabase
    .from("enrollments")
    .select("id, cohort_id, status, cohort:cohorts!inner(id, course_id)")
    .eq("user_id", user.id)
    .eq("cohort.course_id", courseId)
    .in("status", ["active", "completed"])
    .limit(1)
    .maybeSingle();

  const cohortId = enrollmentData?.cohort_id;

  // Fetch progress data
  let progress: Awaited<ReturnType<typeof getCourseProgress>> = null;
  let completedLessonIds = new Set<string>();
  let lessonIsCompleted = false;

  if (cohortId) {
    const [progressData, completions, completed] = await Promise.all([
      getCourseProgress(user.id, cohortId),
      getLessonCompletions(user.id, cohortId),
      isLessonCompleted(user.id, lessonId, cohortId),
    ]);
    progress = progressData;
    completedLessonIds = new Set(completions.map((c) => c.lesson_id));
    lessonIsCompleted = completed;

    // Track last accessed lesson (fire-and-forget, don't block render)
    updateLastAccessed(user.id, cohortId, lessonId).catch(() => {});
  }

  // Determine prev/next lessons from the module tree
  const prevLessonRef = getPreviousLesson(course.modules, lessonId);
  const nextLessonRef = getNextLesson(course.modules, lessonId);

  // Get lesson titles for navigation
  const prevLesson = prevLessonRef
    ? (() => {
        for (const mod of course.modules) {
          const found = mod.lessons.find(
            (l) => l.id === prevLessonRef.lessonId
          );
          if (found) return { id: found.id, title: found.title };
        }
        return null;
      })()
    : null;

  const nextLesson = nextLessonRef
    ? (() => {
        for (const mod of course.modules) {
          const found = mod.lessons.find(
            (l) => l.id === nextLessonRef.lessonId
          );
          if (found) return { id: found.id, title: found.title };
        }
        return null;
      })()
    : null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar — component handles mobile Sheet (fixed button) + desktop static */}
      <aside className="shrink-0 lg:w-72 lg:border-r lg:bg-white dark:lg:bg-slate-950">
        <LessonSidebar
          courseId={courseId}
          courseTitle={course.title}
          modules={course.modules}
          currentLessonId={lessonId}
          completedLessonIds={completedLessonIds}
          progress={progress?.progress_percentage ?? 0}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
          {/* Lesson header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">
              {lesson.title}
            </h1>
            {lesson.estimated_duration_minutes && (
              <p className="mt-1 text-sm text-slate-500">
                Estimated: {lesson.estimated_duration_minutes} min
              </p>
            )}
          </div>

          {/* Video player (for video lessons) */}
          {lesson.lesson_type === "video" && lesson.video_url && (
            <div className="mb-8">
              <VideoPlayer url={lesson.video_url} title={lesson.title} />
            </div>
          )}

          {/* Text content (for text and most lesson types) */}
          {lesson.content && (
            <div className="mb-8">
              <LessonContent content={lesson.content} />
            </div>
          )}

          {/* Quiz indicator */}
          {lesson.lesson_type === "quiz" && (
            <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-800 dark:bg-blue-950">
              <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
                This lesson includes a quiz
              </p>
              <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                Complete the quiz below to progress.
              </p>
            </div>
          )}

          {/* Mark complete + navigation */}
          <div className="space-y-6">
            {cohortId && (
              <div className="flex justify-end">
                <MarkCompleteButton
                  lessonId={lessonId}
                  cohortId={cohortId}
                  isCompleted={lessonIsCompleted}
                />
              </div>
            )}

            <LessonNavigation
              courseId={courseId}
              previousLesson={prevLesson}
              nextLesson={nextLesson}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
