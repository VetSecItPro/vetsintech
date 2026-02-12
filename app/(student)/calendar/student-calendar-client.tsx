"use client";

import { useState } from "react";
import type { CalendarItem } from "@/lib/domains/calendar/types";
import { CalendarView } from "@/components/calendar/calendar-view";

interface StudentCalendarClientProps {
  initialItems: CalendarItem[];
}

export function StudentCalendarClient({
  initialItems,
}: StudentCalendarClientProps) {
  const [items] = useState<CalendarItem[]>(initialItems);

  return (
    <div>
      <CalendarView items={items} />
    </div>
  );
}
