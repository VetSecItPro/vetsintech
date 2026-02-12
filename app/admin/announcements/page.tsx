import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { ROUTES } from "@/lib/constants/routes";
import { getAdminAnnouncements } from "@/lib/domains/notifications/queries";
import { formatDistanceToNow } from "date-fns";
import { Plus, Megaphone, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnnouncementActions } from "./announcement-actions";

export const metadata = {
  title: "Manage Announcements",
};

export default async function AdminAnnouncementsPage() {
  const { organizationId, supabase } = await getAuthenticatedUser();

  const announcements = await getAdminAnnouncements(organizationId);


  // Fetch cohort names for display
  const cohortIds = announcements
    .map((a) => a.cohort_id)
    .filter(Boolean) as string[];
  let cohortMap: Record<string, string> = {};
  if (cohortIds.length > 0) {
    const { data: cohorts } = await supabase
      .from("cohorts")
      .select("id, name")
      .in("id", cohortIds);
    cohortMap = Object.fromEntries(
      (cohorts || []).map((c) => [c.id, c.name])
    );
  }

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

      {/* Announcement table */}
      {announcements.length > 0 ? (
        <div className="rounded-lg border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cohort</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>
                    {a.is_published ? (
                      <Badge className="bg-green-900 text-green-300">
                        <Eye className="mr-1 h-3 w-3" />
                        Published
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-400">
                        <EyeOff className="mr-1 h-3 w-3" />
                        Draft
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.cohort_id && cohortMap[a.cohort_id] ? (
                      <Badge variant="outline" className="text-xs">
                        {cohortMap[a.cohort_id]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500">All</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {a.author.full_name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {a.is_published && a.published_at
                      ? formatDistanceToNow(new Date(a.published_at), {
                          addSuffix: true,
                        })
                      : formatDistanceToNow(new Date(a.created_at), {
                          addSuffix: true,
                        })}
                  </TableCell>
                  <TableCell className="text-right">
                    <AnnouncementActions
                      announcementId={a.id}
                      isPublished={a.is_published}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <Link href={ROUTES.adminNewAnnouncement}>
              Create Announcement
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
