"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications?limit=1");
        if (res.ok) {
          const countHeader = res.headers.get("X-Unread-Count");
          if (countHeader) {
            setUnreadCount(parseInt(countHeader, 10));
          }
        }
      } catch {
        // Silently fail — bell just shows no count
      }
    }
    fetchCount();

    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href={ROUTES.notifications}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white",
              unreadCount > 9 ? "h-5 w-5" : "h-4 w-4"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span className="sr-only">
          {unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"}
        </span>
      </Link>
    </Button>
  );
}
