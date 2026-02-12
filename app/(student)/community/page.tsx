import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { ROUTES } from "@/lib/constants/routes";
import { getDiscussions } from "@/lib/domains/community/queries";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Community",
};

interface CommunityPageProps {
  searchParams: Promise<{ search?: string; cohort_id?: string }>;
}

export default async function CommunityPage({
  searchParams,
}: CommunityPageProps) {
  const sp = await searchParams;
  const { organizationId } = await getAuthenticatedUser();

  const discussions = await getDiscussions(organizationId, {
    search: sp.search,
    cohort_id: sp.cohort_id,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <p className="text-sm text-slate-500">
            Ask questions, share knowledge, help each other
          </p>
        </div>
        <Button asChild>
          <Link href="/community/new">
            <Plus className="mr-2 h-4 w-4" />
            New Discussion
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form className="max-w-md">
        <Input
          name="search"
          placeholder="Search discussions..."
          defaultValue={sp.search}
          className="bg-slate-900 border-slate-700"
        />
      </form>

      {/* Discussion list */}
      {discussions.length > 0 ? (
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {discussions.map((d) => (
            <Link
              key={d.id}
              href={ROUTES.thread(d.id)}
              className="flex items-start gap-4 p-4 transition-colors hover:bg-slate-900/50"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-medium">
                {d.author.full_name.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {d.is_pinned && (
                    <Pin className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  {d.is_locked && (
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <span className="truncate font-medium">{d.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{d.author.full_name}</span>
                  <span>&middot;</span>
                  <span>
                    {formatDistanceToNow(new Date(d.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>

              {/* Reply count */}
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                <MessageSquare className="h-3.5 w-3.5" />
                {d.reply_count}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <MessageSquare className="h-12 w-12 text-slate-600" />
          <p className="mt-3 text-lg font-medium text-slate-400">
            No discussions yet
          </p>
          <p className="text-sm text-slate-500">
            Be the first to start a conversation
          </p>
          <Button asChild className="mt-4">
            <Link href="/community/new">Start a Discussion</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
