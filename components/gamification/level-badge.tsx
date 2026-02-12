"use client";

import { cn } from "@/lib/utils";
import { calculateLevel, getLevelTitle } from "@/lib/domains/gamification/utils";

interface LevelBadgeProps {
  totalXp: number;
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show the rank title alongside the level number */
  showTitle?: boolean;
}

export function LevelBadge({
  totalXp,
  className,
  size = "md",
  showTitle = true,
}: LevelBadgeProps) {
  const level = calculateLevel(totalXp);
  const title = getLevelTitle(level);

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2 py-0.5 text-xs gap-1.5",
    lg: "px-3 py-1 text-sm gap-2",
  };

  const iconSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
        sizeClasses[size],
        className
      )}
    >
      <span className={iconSizes[size]}>
        {level >= 7 ? "**" : level >= 4 ? "*" : ""}
      </span>
      <span>Lvl {level}</span>
      {showTitle && (
        <>
          <span className="text-indigo-400 dark:text-indigo-500">|</span>
          <span>{title}</span>
        </>
      )}
    </span>
  );
}
