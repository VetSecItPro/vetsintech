"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarViewMode } from "@/lib/domains/calendar/types";
import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

const viewModes: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrevious,
  onNext,
  onToday,
  onViewModeChange,
}: CalendarHeaderProps) {
  const getDisplayTitle = () => {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM yyyy");
      case "week":
        return format(currentDate, "MMM d, yyyy");
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday} className="h-8">
          Today
        </Button>
        <h2 className="ml-2 text-lg font-semibold text-slate-200">
          {getDisplayTitle()}
        </h2>
      </div>

      {/* View mode switcher */}
      <div className="flex rounded-lg border border-slate-700 p-0.5">
        {viewModes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onViewModeChange(mode.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              viewMode === mode.value
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
