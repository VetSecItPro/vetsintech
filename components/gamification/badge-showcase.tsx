"use client";

import { cn } from "@/lib/utils";
import { getRarityColor, getRarityLabel } from "@/lib/domains/gamification/utils";
import type { BadgeCatalogItem } from "@/lib/domains/gamification/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeShowcaseProps {
  badges: BadgeCatalogItem[];
  className?: string;
  /** Max badges to display. 0 = show all */
  maxDisplay?: number;
  /** Show locked (unearned) badges as silhouettes */
  showLocked?: boolean;
}

export function BadgeShowcase({
  badges,
  className,
  maxDisplay = 0,
  showLocked = true,
}: BadgeShowcaseProps) {
  const displayed = maxDisplay > 0 ? badges.slice(0, maxDisplay) : badges;
  const earned = displayed.filter((b) => b.earned);
  const locked = showLocked ? displayed.filter((b) => !b.earned) : [];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Earned badges */}
      {earned.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {earned.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}

      {earned.length === 0 && !showLocked && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          No badges earned yet. Complete activities to unlock badges.
        </p>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {locked.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} locked />
          ))}
        </div>
      )}
    </div>
  );
}

interface BadgeCardProps {
  badge: BadgeCatalogItem;
  locked?: boolean;
}

function BadgeCard({ badge, locked = false }: BadgeCardProps) {
  const colors = getRarityColor(badge.rarity);
  const rarityLabel = getRarityLabel(badge.rarity);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group relative flex flex-col items-center rounded-lg border p-3 text-center transition-all",
              locked
                ? "border-slate-200 bg-slate-50 opacity-50 dark:border-slate-700 dark:bg-slate-800/50"
                : cn(colors.border, colors.bg, "hover:shadow-md")
            )}
          >
            {/* Badge icon */}
            <span
              className={cn(
                "text-2xl",
                locked && "grayscale filter"
              )}
            >
              {locked ? "?" : badge.icon}
            </span>

            {/* Badge name */}
            <p
              className={cn(
                "mt-1.5 text-xs font-medium leading-tight",
                locked
                  ? "text-slate-400 dark:text-slate-500"
                  : "text-slate-700 dark:text-slate-200"
              )}
            >
              {locked ? "???" : badge.name}
            </p>

            {/* Rarity indicator */}
            {!locked && (
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium",
                  colors.text
                )}
              >
                {rarityLabel}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-52">
          <p className="font-medium">{badge.name}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          {!locked && badge.earned_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Earned {new Date(badge.earned_at).toLocaleDateString()}
            </p>
          )}
          {locked && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              Locked — keep going to unlock
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
