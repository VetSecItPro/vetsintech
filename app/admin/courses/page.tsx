import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getCourses } from "@/lib/domains/courses/queries";
import { getCourseCategories } from "@/lib/domains/courses/queries";
import { CourseListClient } from "./course-list-client";

export default async function AdminCoursesPage() {
  const { organizationId } = await getAuthenticatedUser();

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
