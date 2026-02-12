import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getLearningPaths } from "@/lib/domains/learning-paths/queries";
import { PathListClient } from "./path-list-client";

export default async function AdminPathsPage() {
  const { organizationId } = await getAuthenticatedUser();

  const paths = await getLearningPaths(organizationId);

  return <PathListClient initialPaths={paths} />;
}
