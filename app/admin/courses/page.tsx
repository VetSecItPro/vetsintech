import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCourses } from "@/lib/domains/courses/queries";
import { getCourseCategories } from "@/lib/domains/courses/queries";
import { ROUTES } from "@/lib/constants/routes";
import { CourseListClient } from "./course-list-client";

export default async function AdminCoursesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect(ROUTES.login);
  }

  const organizationId = profile.organization_id;

  const [courses, categories] = await Promise.all([
    getCourses(organizationId),
    getCourseCategories(organizationId),
  ]);

  return (
    <CourseListClient
      initialCourses={courses}
      categories={categories}
    />
  );
}
