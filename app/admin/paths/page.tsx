import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLearningPaths } from "@/lib/domains/learning-paths/queries";
import { ROUTES } from "@/lib/constants/routes";
import { PathListClient } from "./path-list-client";

export default async function AdminPathsPage() {
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

  const paths = await getLearningPaths(profile.organization_id);

  return <PathListClient initialPaths={paths} />;
}
