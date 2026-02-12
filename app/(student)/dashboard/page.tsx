import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { CourseCard } from "@/components/courses/course-card";
import {
  ContinueLearning,
  type ContinueLearningItem,
} from "@/components/courses/continue-learning";
import {
  AnnouncementsWidget,
  type AnnouncementPreview,
} from "@/components/shared/announcements-widget";
import { GraduationCap } from "lucide-react";
import {
  getStudentEnrollments,
  getContinueLearning,
} from "@/lib/domains/progress/queries";
import { getAnnouncements } from "@/lib/domains/notifications/queries";

export const metadata = {
  title: "Dashboard",
};

export default async function StudentDashboardPage() {
  const { user, profile, organizationId } = await getAuthenticatedUser();

  // Fetch all data through domain queries in parallel
  const [enrollments, continueLearningData, announcementRows] =
    await Promise.all([
      getStudentEnrollments(user.id, organizationId, {
        statuses: ["active", "completed"],
      }),
      getContinueLearning(user.id, organizationId),
      getAnnouncements(organizationId, { limit: 3 }),
    ]);

  // Map domain ContinueLearningItem → component ContinueLearningItem
  const continueLearningItems: ContinueLearningItem[] = continueLearningData
    .filter((item) => item.last_lesson_id !== null)
    .slice(0, 3)
    .map((item) => ({
      courseId: item.course_id,
      courseTitle: item.course_title,
      lessonId: item.last_lesson_id!,
      lessonTitle: item.last_lesson_title || "Continue",
      progress: item.progress_percentage,
    }));

  // Map AnnouncementWithAuthor → AnnouncementPreview
  const announcements: AnnouncementPreview[] = announcementRows.map((a) => {
    let excerpt = "New announcement";
    if (a.body && typeof a.body === "object") {
      const extractText = (node: Record<string, unknown>): string => {
        if (node.text && typeof node.text === "string") return node.text;
        if (Array.isArray(node.content)) {
          return node.content
            .map((c: Record<string, unknown>) => extractText(c))
            .join("");
        }
        return "";
      };
      const text = extractText(a.body as Record<string, unknown>);
      excerpt = text.slice(0, 120) || "New announcement";
    }
    return {
      id: a.id,
      title: a.title,
      excerpt,
      published_at: a.published_at ?? a.created_at,
      author_name: a.author.full_name || "Instructor",
    };
  });

  const firstName = profile.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-slate-500">
          {enrollments.length > 0
            ? `You're enrolled in ${enrollments.length} course${enrollments.length !== 1 ? "s" : ""}`
            : "Browse available courses to get started"}
        </p>
      </div>

      {/* Continue learning + Announcements */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContinueLearning items={continueLearningItems} />
        </div>
        <div>
          <AnnouncementsWidget announcements={announcements} />
        </div>
      </div>

      {/* Enrolled courses grid */}
      {enrollments.length > 0 ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold">My Courses</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                courseId={enrollment.course.id}
                title={enrollment.course.title}
                description={enrollment.course.description}
                category={enrollment.course.category}
                thumbnailUrl={enrollment.course.thumbnail_url}
                progress={enrollment.progress?.progress_percentage ?? 0}
                totalLessons={enrollment.progress?.total_lessons ?? 0}
                completedLessons={enrollment.progress?.completed_lessons ?? 0}
                estimatedMinutes={enrollment.course.estimated_duration_minutes}
                lastAccessedAt={enrollment.progress?.last_activity_at ?? null}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <GraduationCap className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-lg font-medium text-slate-600">
            No courses yet
          </p>
          <p className="text-sm text-slate-400">
            You&apos;ll see your enrolled courses here once an admin adds you to
            a cohort.
          </p>
        </div>
      )}
    </div>
  );
}
