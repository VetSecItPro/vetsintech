import Link from "next/link";
import { Megaphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface AnnouncementPreview {
  id: string;
  title: string;
  excerpt: string;
  published_at: string;
  author_name: string;
}

interface AnnouncementsWidgetProps {
  announcements: AnnouncementPreview[];
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AnnouncementsWidget({ announcements }: AnnouncementsWidgetProps) {
  if (announcements.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Announcements
        </CardTitle>
        <CardDescription>Latest updates from your instructors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="border-b pb-3 last:border-0 last:pb-0"
          >
            <p className="text-sm font-medium leading-tight">
              {announcement.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
              {announcement.excerpt}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {announcement.author_name} &middot; {timeAgo(announcement.published_at)}
            </p>
          </div>
        ))}

        <Button variant="ghost" size="sm" asChild className="w-full">
          <Link href="/announcements">View all</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
