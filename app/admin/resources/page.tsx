import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getResources } from "@/lib/domains/resources/queries";
import { getCourses } from "@/lib/domains/courses/queries";
import { AdminResourcesClient } from "./admin-resources-client";

export default async function AdminResourcesPage() {
  const { organizationId } = await getAuthenticatedUser();

  const [resources, courses] = await Promise.all([
    getResources(organizationId),
    getCourses(organizationId),
  ]);

  return (
    <AdminResourcesClient
      initialResources={resources}
      courses={courses.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
