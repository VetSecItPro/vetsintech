import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { getResources } from "@/lib/domains/resources/queries";
import { getCourses } from "@/lib/domains/courses/queries";
import { AdminResourcesClient } from "./admin-resources-client";

export default async function AdminResourcesPage() {
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
