import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getResources } from "@/lib/domains/resources/queries";
import { getCourses } from "@/lib/domains/courses/queries";
import { ResourceLibraryClient } from "./resource-library-client";

export const metadata = {
  title: "Resources",
};

export default async function ResourcesPage() {
  const { organizationId } = await getAuthenticatedUser();

  const [resources, courses] = await Promise.all([
    getResources(organizationId),
    getCourses(organizationId, { status: "published" }),
  ]);

  return (
    <ResourceLibraryClient
      initialResources={resources}
      courses={courses.map((c) => ({ id: c.id, title: c.title }))}
      isAdmin={false}
    />
  );
}
