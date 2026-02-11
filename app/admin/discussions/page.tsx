import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pin, Lock, MessageSquare } from "lucide-react";
import { DiscussionModActions } from "@/components/admin/discussion-mod-actions";

export default async function AdminDiscussionsPage() {
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

  if (!profile || (profile.role !== "admin" && profile.role !== "instructor")) {
    redirect(ROUTES.dashboard);
  }

  const { data: discussions } = await supabase
    .from("discussions")
    .select(
      `
      id,
      title,
      is_pinned,
      is_locked,
      created_at,
      author:profiles!discussions_author_id_fkey(full_name),
      posts:posts(count)
    `
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Discussion Moderation</h1>
        <p className="text-slate-400 mt-1">
          Manage and moderate community discussions
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Discussions</CardTitle>
          <CardDescription className="text-slate-400">
            {discussions?.length ?? 0} discussions in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Title</TableHead>
                <TableHead className="text-slate-400">Author</TableHead>
                <TableHead className="text-slate-400">Replies</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
                <TableHead className="text-slate-400 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discussions && discussions.length > 0 ? (
                discussions.map((discussion) => {
                  const replyCount =
                    (discussion.posts as unknown as { count: number }[])?.[0]
                      ?.count ?? 0;
                  const authorName =
                    (discussion.author as unknown as { full_name: string })
                      ?.full_name ?? "Unknown";

                  return (
                    <TableRow
                      key={discussion.id}
                      className="border-slate-800 hover:bg-slate-800/50"
                    >
                      <TableCell className="text-white font-medium">
                        {discussion.title}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {authorName}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {replyCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {discussion.is_pinned && (
                            <Badge
                              variant="secondary"
                              className="bg-amber-500/10 text-amber-400 border-amber-500/20"
                            >
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                          {discussion.is_locked && (
                            <Badge
                              variant="secondary"
                              className="bg-red-500/10 text-red-400 border-red-500/20"
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                          {!discussion.is_pinned && !discussion.is_locked && (
                            <span className="text-slate-500 text-sm">
                              Open
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(discussion.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DiscussionModActions
                          discussionId={discussion.id}
                          isPinned={discussion.is_pinned}
                          isLocked={discussion.is_locked}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="border-slate-800">
                  <TableCell
                    colSpan={6}
                    className="text-center text-slate-500 py-8"
                  >
                    No discussions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
