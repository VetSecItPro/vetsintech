import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { getAdminAnnouncements } from "@/lib/domains/notifications/queries";
import { formatDistanceToNow } from "date-fns";
import { Plus, Megaphone, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Manage Announcements",
};

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect(ROUTES.login);

  const announcements = await getAdminAnnouncements(profile.organization_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500">
            Create and manage announcements for your students
          </p>
        </div>
        <Button asChild>
          <Link href={ROUTES.adminNewAnnouncement}>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Link>
        </Button>
      </div>

      {/* Announcement list */}
      {announcements.length > 0 ? (
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium">{a.title}</h3>
                  {a.is_published ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-950 px-2 py-0.5 text-xs text-green-400">
                      <Eye className="h-3 w-3" />
                      Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      <EyeOff className="h-3 w-3" />
                      Draft
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>By {a.author.full_name}</span>
                  <span>&middot;</span>
                  <span>
                    {a.is_published && a.published_at
                      ? `Published ${formatDistanceToNow(new Date(a.published_at), { addSuffix: true })}`
                      : `Created ${formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <Megaphone className="h-12 w-12 text-slate-600" />
          <p className="mt-3 text-lg font-medium text-slate-400">
            No announcements
          </p>
          <p className="text-sm text-slate-500">
            Create your first announcement to communicate with students
          </p>
          <Button asChild className="mt-4">
            <Link href={ROUTES.adminNewAnnouncement}>Create Announcement</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
