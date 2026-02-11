import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { SettingsClient } from "@/components/admin/settings-client";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect(ROUTES.dashboard);
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, logo_url")
    .eq("id", profile.organization_id)
    .single();

  if (!org) {
    redirect(ROUTES.dashboard);
  }

  const { data: membersRaw } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      user_roles!inner(role)
    `
    )
    .eq("organization_id", profile.organization_id)
    .order("full_name", { ascending: true });

  const members = (membersRaw ?? []).map((m) => {
    const roles = m.user_roles as unknown as { role: string }[];
    return {
      id: m.id,
      fullName: m.full_name ?? "Unnamed",
      email: m.email ?? "",
      role: roles?.[0]?.role ?? "student",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Organization Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your organization details and team members
        </p>
      </div>

      <SettingsClient
        orgId={org.id}
        orgName={org.name}
        orgLogoUrl={org.logo_url ?? ""}
        members={members}
      />
    </div>
  );
}
