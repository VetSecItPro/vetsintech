"use client";

import { isSameDay, isToday } from "date-fns";
import type { CalendarItem } from "@/lib/domains/calendar/types";
import { CalendarEventChip } from "./calendar-event-chip";
import { cn } from "@/lib/utils";

interface CalendarDayCellProps {
  date: Date;
  items: CalendarItem[];
  currentMonth: boolean;
  onDateClick?: (date: Date) => void;
  onItemClick?: (item: CalendarItem) => void;
}

const MAX_VISIBLE_ITEMS = 3;

export function CalendarDayCell({
  date,
  items,
  currentMonth,
  onDateClick,
  onItemClick,
}: CalendarDayCellProps) {
  const dayItems = items.filter((item) =>
    isSameDay(new Date(item.startTime), date)
  );
  const today = isToday(date);
  const visibleItems = dayItems.slice(0, MAX_VISIBLE_ITEMS);
  const overflowCount = dayItems.length - MAX_VISIBLE_ITEMS;

  return (
    <div
      className={cn(
        "min-h-[100px] border-b border-r border-slate-800 p-1",
        !currentMonth && "bg-slate-900/50",
        currentMonth && "bg-slate-950"
      )}
    >
      <button
        onClick={() => onDateClick?.(date)}
        className={cn(
          "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
          today && "bg-blue-600 text-white",
          !today && currentMonth && "text-slate-300 hover:bg-slate-800",
          !today && !currentMonth && "text-slate-600"
        )}
      >
        {date.getDate()}
      </button>

      <div className="space-y-0.5">
        {visibleItems.map((item) => (
          <CalendarEventChip
            key={`${item.type}-${item.id}`}
            item={item}
            compact
            onClick={() => onItemClick?.(item)}
          />
        ))}
        {overflowCount > 0 && (
          <button
            onClick={() => onDateClick?.(date)}
            className="w-full px-1 text-left text-[10px] font-medium text-slate-400 hover:text-slate-300"
          >
            +{overflowCount} more
          </button>
        )}
      </div>
    </div>
  );
}
