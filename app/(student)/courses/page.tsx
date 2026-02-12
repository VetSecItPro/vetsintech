import Link from "next/link";
import Image from "next/image";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { ROUTES } from "@/lib/constants/routes";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Courses",
};

export default async function CoursesPage() {
  const { user, organizationId, supabase } = await getAuthenticatedUser();

  // Get enrolled courses with progress
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id,
      status,
      cohort:cohorts!inner(
        id,
        name,
        course:courses!inner(
          id,
          title,
          slug,
          description,
          thumbnail_url,
          category,
          estimated_duration_minutes
        )
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active");

  // Get progress for enrolled courses
  const { data: progress } = await supabase
    .from("course_progress")
    .select("cohort_id, progress_percentage, completed_lessons, total_lessons")
    .eq("user_id", user.id);

  const progressMap = new Map(
    (progress || []).map((p) => [p.cohort_id, p])
  );

  // Get all published courses (for discovery)
  const { data: allCourses } = await supabase
    .from("courses")
    .select("id, title, slug, description, thumbnail_url, category, estimated_duration_minutes")
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("title");

  const enrolledCourseIds = new Set(
    (enrollments || []).map((e) => {
      const cohort = e.cohort as unknown as { course: { id: string } };
      return cohort.course.id;
    })
  );

  const availableCourses = (allCourses || []).filter(
    (c) => !enrolledCourseIds.has(c.id)
  );

  return (
    <div className="space-y-8">
      {/* Enrolled courses */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
        <p className="text-sm text-slate-500">
          Your enrolled courses and learning progress
        </p>

        {enrollments && enrollments.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => {
              const cohort = enrollment.cohort as unknown as {
                id: string;
                name: string;
                course: {
                  id: string;
                  title: string;
                  slug: string;
                  description: string | null;
                  thumbnail_url: string | null;
                  category: string | null;
                  estimated_duration_minutes: number | null;
                };
              };
              const prog = progressMap.get(cohort.id);
              const percentage = prog?.progress_percentage || 0;

              return (
                <Link
                  key={enrollment.id}
                  href={ROUTES.course(cohort.course.id)}
                  className="group flex flex-col overflow-hidden rounded-lg border border-slate-800 transition-colors hover:border-slate-700"
                >
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-blue-950 to-slate-900">
                    {cohort.course.thumbnail_url ? (
                      <Image
                        src={cohort.course.thumbnail_url}
                        alt={cohort.course.title}
                        width={400}
                        height={300}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-10 w-10 text-blue-500/50" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    {cohort.course.category && (
                      <span className="text-xs text-blue-400">{cohort.course.category}</span>
                    )}
                    <h3 className="mt-1 font-semibold group-hover:text-blue-400 transition-colors">
                      {cohort.course.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{cohort.name}</p>
                    <div className="mt-auto pt-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{Math.round(Number(percentage))}% complete</span>
                        {prog && (
                          <span>
                            {prog.completed_lessons}/{prog.total_lessons} lessons
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min(Number(percentage), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-12">
            <BookOpen className="h-10 w-10 text-slate-600" />
            <p className="mt-3 font-medium text-slate-400">
              No enrolled courses yet
            </p>
            <p className="text-sm text-slate-500">
              Browse available courses below to get started
            </p>
          </div>
        )}
      </div>

      {/* Available courses */}
      {availableCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold tracking-tight">Available Courses</h2>
          <p className="text-sm text-slate-500">
            Courses you can enroll in
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/30"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      width={400}
                      height={300}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpen className="h-10 w-10 text-slate-600" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {course.category && (
                    <span className="text-xs text-slate-400">{course.category}</span>
                  )}
                  <h3 className="mt-1 font-semibold">{course.title}</h3>
                  <p className="mt-1 flex-1 text-xs text-slate-500 line-clamp-2">
                    {course.description || "No description"}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    {course.estimated_duration_minutes && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {Math.round(course.estimated_duration_minutes / 60)}h
                      </span>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={ROUTES.course(course.id)}>
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
