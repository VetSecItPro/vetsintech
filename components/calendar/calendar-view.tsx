"use client";

import { useState, useCallback, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameMonth,
  isSameDay,
  format,
  isToday,
} from "date-fns";
import { useRouter } from "next/navigation";
import type { CalendarItem, CalendarViewMode } from "@/lib/domains/calendar/types";
import { CalendarHeader } from "./calendar-header";
import { CalendarDayCell } from "./calendar-day-cell";
import { CalendarEventChip } from "./calendar-event-chip";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  items: CalendarItem[];
  initialDate?: Date;
  initialViewMode?: CalendarViewMode;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------- Time slots for week/day views ----------
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarView({
  items,
  initialDate,
  initialViewMode = "month",
}: CalendarViewProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialViewMode);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    switch (viewMode) {
      case "month":
        setCurrentDate((d) => subMonths(d, 1));
        break;
      case "week":
        setCurrentDate((d) => subWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => subDays(d, 1));
        break;
    }
  }, [viewMode]);

  const handleNext = useCallback(() => {
    switch (viewMode) {
      case "month":
        setCurrentDate((d) => addMonths(d, 1));
        break;
      case "week":
        setCurrentDate((d) => addWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => addDays(d, 1));
        break;
    }
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDateClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      if (viewMode === "month") {
        setViewMode("day");
      }
    },
    [viewMode]
  );

  const handleItemClick = useCallback(
    (item: CalendarItem) => {
      if (item.url) {
        router.push(item.url);
      }
    },
    [router]
  );

  // ---------- Month view ----------
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // ---------- Week view ----------
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // ---------- Render ----------
  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={setViewMode}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          Assignment
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          Quiz
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          Event
        </div>
      </div>

      {viewMode === "month" && (
        <MonthView
          days={monthDays}
          currentDate={currentDate}
          items={items}
          onDateClick={handleDateClick}
          onItemClick={handleItemClick}
        />
      )}

      {viewMode === "week" && (
        <WeekView
          days={weekDays}
          items={items}
          onDateClick={handleDateClick}
          onItemClick={handleItemClick}
        />
      )}

      {viewMode === "day" && (
        <DayView
          date={currentDate}
          items={items}
          onItemClick={handleItemClick}
        />
      )}
    </div>
  );
}

// ============================================================================
// Month View
// ============================================================================

function MonthView({
  days,
  currentDate,
  items,
  onDateClick,
  onItemClick,
}: {
  days: Date[];
  currentDate: Date;
  items: CalendarItem[];
  onDateClick: (date: Date) => void;
  onItemClick: (item: CalendarItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-slate-400"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <CalendarDayCell
            key={day.toISOString()}
            date={day}
            items={items}
            currentMonth={isSameMonth(day, currentDate)}
            onDateClick={onDateClick}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Week View
// ============================================================================

function WeekView({
  days,
  items,
  onDateClick,
  onItemClick,
}: {
  days: Date[];
  items: CalendarItem[];
  onDateClick: (date: Date) => void;
  onItemClick: (item: CalendarItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-800 bg-slate-900">
        <div className="border-r border-slate-800" />
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateClick(day)}
            className={cn(
              "border-r border-slate-800 px-2 py-2 text-center last:border-r-0",
              isToday(day) && "bg-blue-600/10"
            )}
          >
            <div className="text-xs text-slate-400">{format(day, "EEE")}</div>
            <div
              className={cn(
                "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                isToday(day) && "bg-blue-600 text-white",
                !isToday(day) && "text-slate-300"
              )}
            >
              {format(day, "d")}
            </div>
          </button>
        ))}
      </div>

      {/* Time slots */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-800/50 last:border-b-0"
          >
            <div className="flex items-start justify-end border-r border-slate-800 px-2 py-1 text-[10px] text-slate-500">
              {format(new Date().setHours(hour, 0), "ha")}
            </div>
            {days.map((day) => {
              const dayHourItems = items.filter((item) => {
                const itemDate = new Date(item.startTime);
                return isSameDay(itemDate, day) && itemDate.getHours() === hour;
              });
              return (
                <div
                  key={day.toISOString()}
                  className="min-h-[40px] border-r border-slate-800/50 p-0.5 last:border-r-0"
                >
                  {dayHourItems.map((item) => (
                    <CalendarEventChip
                      key={`${item.type}-${item.id}`}
                      item={item}
                      compact
                      onClick={() => onItemClick(item)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Day View
// ============================================================================

function DayView({
  date,
  items,
  onItemClick,
}: {
  date: Date;
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
}) {
  const dayItems = items.filter((item) =>
    isSameDay(new Date(item.startTime), date)
  );

  // All-day items
  const allDayItems = dayItems.filter((item) => item.allDay);
  const timedItems = dayItems.filter((item) => !item.allDay);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      {/* All-day section */}
      {allDayItems.length > 0 && (
        <div className="border-b border-slate-800 bg-slate-900/50 p-2">
          <div className="mb-1 text-xs font-medium text-slate-400">All Day</div>
          <div className="space-y-1">
            {allDayItems.map((item) => (
              <CalendarEventChip
                key={`${item.type}-${item.id}`}
                item={item}
                onClick={() => onItemClick(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timed items list */}
      {timedItems.length > 0 ? (
        <div className="divide-y divide-slate-800/50">
          {timedItems.map((item) => {
            const itemDate = new Date(item.startTime);
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => onItemClick(item)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-900/50"
              >
                <div
                  className="h-10 w-1 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-400">
                    {format(itemDate, "h:mm a")}
                    {item.endTime && ` - ${format(new Date(item.endTime), "h:mm a")}`}
                    {item.courseName && ` \u00B7 ${item.courseName}`}
                  </div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.type}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        !allDayItems.length && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-slate-400">No events on this day</p>
          </div>
        )
      )}
    </div>
  );
}
