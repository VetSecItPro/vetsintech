"use client";

import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function StreakCounter({
  currentStreak,
  longestStreak,
  className,
  compact = false,
}: StreakCounterProps) {
  const isActive = currentStreak > 0;

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
          isActive
            ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
          className
        )}
      >
        <Flame className={cn("h-3.5 w-3.5", isActive && "text-orange-500")} />
        <span className="text-xs font-medium">{currentStreak}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full p-3",
          isActive
            ? "bg-orange-50 dark:bg-orange-900/20"
            : "bg-slate-100 dark:bg-slate-800"
        )}
      >
        <Flame
          className={cn(
            "h-8 w-8",
            isActive
              ? "text-orange-500 dark:text-orange-400"
              : "text-slate-400 dark:text-slate-500"
          )}
        />
      </div>

      <div className="text-center">
        <p
          className={cn(
            "text-2xl font-bold",
            isActive
              ? "text-orange-600 dark:text-orange-400"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          {currentStreak}
        </p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {currentStreak === 1 ? "day streak" : "day streak"}
        </p>
      </div>

      {longestStreak > 0 && (
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
        </p>
      )}
    </div>
  );
}
