import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { ROUTES } from "@/lib/constants/routes";
import { getDiscussionWithPosts } from "@/lib/domains/community/queries";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Pin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscussionThread } from "@/components/community/discussion-thread";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("discussions")
    .select("title")
    .eq("id", threadId)
    .single();

  return {
    title: data?.title || "Discussion",
  };
}

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  const { user } = await getAuthenticatedUser();

  const thread = await getDiscussionWithPosts(threadId, user.id);
  if (!thread) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={ROUTES.community}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Community
        </Link>
      </Button>

      {/* Thread header */}
      <div>
        <div className="flex items-center gap-2">
          {thread.is_pinned && (
            <Pin className="h-4 w-4 text-amber-500" />
          )}
          {thread.is_locked && (
            <Lock className="h-4 w-4 text-slate-500" />
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {thread.title}
          </h1>
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-medium">
              {thread.author.full_name.charAt(0).toUpperCase()}
            </div>
            <span>{thread.author.full_name}</span>
          </div>
          <span>&middot;</span>
          <span>
            {formatDistanceToNow(new Date(thread.created_at), {
              addSuffix: true,
            })}
          </span>
          <span>&middot;</span>
          <span>
            {thread.reply_count} {thread.reply_count === 1 ? "reply" : "replies"}
          </span>
        </div>
      </div>

      {/* Thread body + posts — client component for interactivity */}
      <DiscussionThread
        discussion={thread}
        posts={thread.posts}
        isLocked={thread.is_locked}
        currentUserId={user.id}
      />
    </div>
  );
}
