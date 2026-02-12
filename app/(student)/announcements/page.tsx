import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getAnnouncements } from "@/lib/domains/notifications/queries";
import { formatDistanceToNow } from "date-fns";
import { Megaphone } from "lucide-react";

export const metadata = {
  title: "Announcements",
};

export default async function AnnouncementsPage() {
  const { organizationId } = await getAuthenticatedUser();

  const announcements = await getAnnouncements(organizationId, {
    limit: 50,
  });

  // Tiptap JSON text extractor
  function extractText(node: Record<string, unknown>): string {
    if (node.text && typeof node.text === "string") return node.text;
    if (Array.isArray(node.content)) {
      return node.content
        .map((c: Record<string, unknown>) => extractText(c))
        .join("");
    }
    return "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-slate-500">
          Important updates from your instructors
        </p>
      </div>

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((a) => {
            const excerpt = extractText(a.body as Record<string, unknown>)
              .slice(0, 200);

            return (
              <div
                key={a.id}
                className="rounded-lg border border-slate-800 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-950 p-2">
                    <Megaphone className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{a.title}</h2>
                    <p className="mt-1 text-sm text-slate-400 line-clamp-3">
                      {excerpt || "No content"}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span>{a.author.full_name}</span>
                      {a.published_at && (
                        <>
                          <span>&middot;</span>
                          <span>
                            {formatDistanceToNow(new Date(a.published_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <Megaphone className="h-12 w-12 text-slate-600" />
          <p className="mt-3 text-lg font-medium text-slate-400">
            No announcements yet
          </p>
          <p className="text-sm text-slate-500">
            Check back later for updates from your instructors
          </p>
        </div>
      )}
    </div>
  );
}
