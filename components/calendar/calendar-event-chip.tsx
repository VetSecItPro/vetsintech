"use client";

import type { CalendarItem } from "@/lib/domains/calendar/types";
import { FileText, HelpCircle, CalendarDays } from "lucide-react";

interface CalendarEventChipProps {
  item: CalendarItem;
  compact?: boolean;
  onClick?: () => void;
}

const typeIcons: Record<CalendarItem["type"], typeof FileText> = {
  assignment: FileText,
  quiz: HelpCircle,
  event: CalendarDays,
};

export function CalendarEventChip({
  item,
  compact = false,
  onClick,
}: CalendarEventChipProps) {
  const Icon = typeIcons[item.type];

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] font-medium text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: item.color }}
        title={item.title}
      >
        <span className="truncate">{item.title}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-medium text-white transition-opacity hover:opacity-80"
      style={{ backgroundColor: item.color }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{item.title}</span>
    </button>
  );
}
