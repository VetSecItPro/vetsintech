"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText, HelpCircle, AlertTriangle, CalendarDays } from "lucide-react";
import type { UpcomingDeadline } from "@/lib/domains/calendar/types";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";

interface UpcomingDeadlinesWidgetProps {
  deadlines: UpcomingDeadline[];
}

const typeIcons = {
  assignment: FileText,
  quiz: HelpCircle,
  event: CalendarDays,
} as const;

function formatRelativeDate(daysUntilDue: number, dueDate: string): string {
  if (daysUntilDue === 0) return "Today";
  if (daysUntilDue === 1) return "Tomorrow";
  if (daysUntilDue === -1) return "Yesterday";
  if (daysUntilDue < 0) {
    return formatDistanceToNow(new Date(dueDate), { addSuffix: true });
  }
  return `In ${daysUntilDue} days`;
}

export function UpcomingDeadlinesWidget({
  deadlines,
}: UpcomingDeadlinesWidgetProps) {
  const overdueItems = deadlines.filter((d) => d.isOverdue);
  const upcomingItems = deadlines.filter((d) => !d.isOverdue);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">Due This Week</h3>
        <Link
          href={ROUTES.calendar}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View Calendar
        </Link>
      </div>

      {deadlines.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <CalendarDays className="h-8 w-8 text-slate-600" />
          <p className="mt-2 text-sm text-slate-400">No upcoming deadlines</p>
          <p className="text-xs text-slate-500">
            You&apos;re all caught up!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {/* Overdue items at top */}
          {overdueItems.map((deadline) => (
            <DeadlineItem
              key={`${deadline.type}-${deadline.id}`}
              deadline={deadline}
              isOverdue
            />
          ))}

          {/* Upcoming items */}
          {upcomingItems.map((deadline) => (
            <DeadlineItem
              key={`${deadline.type}-${deadline.id}`}
              deadline={deadline}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeadlineItem({
  deadline,
  isOverdue = false,
}: {
  deadline: UpcomingDeadline;
  isOverdue?: boolean;
}) {
  const Icon = typeIcons[deadline.type];
  const relativeDate = formatRelativeDate(
    deadline.daysUntilDue,
    deadline.dueDate
  );

  const linkUrl =
    deadline.type === "assignment" && deadline.courseId
      ? `/courses/${deadline.courseId}/assignments/${deadline.id}`
      : null;

  const content = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors",
        linkUrl && "hover:bg-slate-900/50 cursor-pointer",
        isOverdue && "bg-red-950/20"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isOverdue
            ? "bg-red-900/50 text-red-400"
            : deadline.type === "assignment"
              ? "bg-red-900/30 text-red-400"
              : "bg-blue-900/30 text-blue-400"
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "truncate text-sm font-medium",
            isOverdue ? "text-red-300" : "text-slate-200"
          )}
        >
          {deadline.title}
        </div>
        <div className="text-xs text-slate-500">
          {deadline.courseName && `${deadline.courseName} \u00B7 `}
          <span className={cn(isOverdue && "text-red-400 font-medium")}>
            {relativeDate}
          </span>
        </div>
      </div>
    </div>
  );

  if (linkUrl) {
    return <Link href={linkUrl}>{content}</Link>;
  }

  return content;
}
