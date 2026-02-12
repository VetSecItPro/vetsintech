"use client";

import { useState, useEffect, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format,
} from "date-fns";
import type { CalendarItem } from "@/lib/domains/calendar/types";
import { CalendarView } from "@/components/calendar/calendar-view";

interface StudentCalendarClientProps {
  initialItems: CalendarItem[];
  organizationId: string;
}

export function StudentCalendarClient({
  initialItems,
  organizationId,
}: StudentCalendarClientProps) {
  const [items, setItems] = useState<CalendarItem[]>(initialItems);
  const [loading, setLoading] = useState(false);

  // Refresh items when navigating to a new date range
  const fetchItems = useCallback(
    async (centerDate: Date) => {
      setLoading(true);
      try {
        const start = startOfMonth(subMonths(centerDate, 1)).toISOString();
        const end = endOfMonth(addMonths(centerDate, 1)).toISOString();
        const params = new URLSearchParams({ start, end });
        const res = await fetch(`/api/calendar?${params}`);
        if (res.ok) {
          const json = await res.json();
          setItems(json.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch calendar items:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return (
    <div>
      {loading && (
        <div className="mb-2 text-xs text-slate-500">Loading...</div>
      )}
      <CalendarView items={items} />
    </div>
  );
}
