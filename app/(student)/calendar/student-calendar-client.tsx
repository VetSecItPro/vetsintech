"use client";

import type { CalendarItem } from "@/lib/domains/calendar/types";
import { CalendarView } from "@/components/calendar/calendar-view";

interface StudentCalendarClientProps {
  initialItems: CalendarItem[];
}

export function StudentCalendarClient({
  initialItems,
}: StudentCalendarClientProps) {
  return (
    <div>
      <CalendarView items={initialItems} />
    </div>
  );
}
