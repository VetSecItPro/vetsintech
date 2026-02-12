"use client";

import { cn } from "@/lib/utils";
import {
  calculateLevel,
  getLevelTitle,
  getXpProgressInLevel,
  formatXpAmount,
} from "@/lib/domains/gamification/utils";

interface XpBarProps {
  totalXp: number;
  className?: string;
  /** Show the rank title above the bar */
  showRankTitle?: boolean;
  /** Compact mode — less padding, smaller text */
  compact?: boolean;
}

export function XpBar({
  totalXp,
  className,
  showRankTitle = true,
  compact = false,
}: XpBarProps) {
  const level = calculateLevel(totalXp);
  const rankTitle = getLevelTitle(level);
  const progress = getXpProgressInLevel(totalXp);
  const isMaxLevel = progress.needed === 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      {showRankTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-semibold text-slate-900 dark:text-white",
                compact ? "text-sm" : "text-base"
              )}
            >
              {rankTitle}
            </span>
            <span
              className={cn(
                "rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                compact ? "text-xs" : "text-xs"
              )}
            >
              Lvl {level}
            </span>
          </div>
          <span
            className={cn(
              "text-slate-500 dark:text-slate-400",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {isMaxLevel
              ? formatXpAmount(totalXp)
              : `${formatXpAmount(progress.earned)} / ${formatXpAmount(progress.needed)}`}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
          compact ? "h-2" : "h-3"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isMaxLevel
              ? "bg-amber-500"
              : "bg-gradient-to-r from-blue-500 to-indigo-600"
          )}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {!showRankTitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isMaxLevel ? "Max rank reached" : `${progress.percentage}% to next rank`}
        </p>
      )}
    </div>
  );
}
