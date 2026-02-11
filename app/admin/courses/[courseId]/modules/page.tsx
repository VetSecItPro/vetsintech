import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCourseWithModules } from "@/lib/domains/courses/queries";
import { ROUTES } from "@/lib/constants/routes";
import { Badge } from "@/components/ui/badge";
import { ModuleList } from "@/components/courses/module-list";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archived: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  // Get org from profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) notFound();

  const course = await getCourseWithModules(courseId, profile.organization_id);
  if (!course) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.adminCourses}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <Badge className={STATUS_COLORS[course.status]}>{course.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Manage modules and lessons for this course
        </p>
      </div>

      {/* Module list with inline lesson management */}
      <ModuleList courseId={courseId} modules={course.modules} />
    </div>
  );
}
