"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Award,
  GraduationCap,
  Megaphone,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  announcement: Megaphone,
  discussion_reply: MessageSquare,
  quiz_graded: BookOpen,
  enrollment: GraduationCap,
  course_completed: GraduationCap,
  certificate_issued: Award,
  mention: MessageSquare,
  cohort_update: Bell,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications?limit=50");
        if (res.ok) {
          const { data } = await res.json();
          setNotifications(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  function handleMarkAllRead() {
    startTransition(async () => {
      const res = await fetch("/api/notifications", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      }
    });
  }

  function handleMarkRead(id: string, link: string | null) {
    startTransition(async () => {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (link) {
        router.push(link);
      }
    });
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length > 0 ? (
        <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;

            return (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n.id, n.link)}
                className={cn(
                  "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-slate-900/50",
                  !n.is_read && "bg-slate-900/30"
                )}
              >
                <div
                  className={cn(
                    "rounded-full p-2",
                    n.is_read ? "bg-slate-800" : "bg-blue-950"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      n.is_read ? "text-slate-500" : "text-blue-400"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        n.is_read && "text-slate-400"
                      )}
                    >
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-600">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <Check className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <Bell className="h-12 w-12 text-slate-600" />
          <p className="mt-3 text-lg font-medium text-slate-400">
            No notifications
          </p>
          <p className="text-sm text-slate-500">
            You&apos;ll see updates here when something happens
          </p>
        </div>
      )}
    </div>
  );
}
