"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XpBar } from "./xp-bar";
import { StreakCounter } from "./streak-counter";
import { LevelBadge } from "./level-badge";
import { getRarityColor } from "@/lib/domains/gamification/utils";
import { formatXpAmount } from "@/lib/domains/gamification/utils";
import { Trophy, Flame, Award } from "lucide-react";
import type { UserBadgeWithDetails } from "@/lib/domains/gamification/types";

// ============================================================================
// XP Summary Card
// ============================================================================

interface XpSummaryCardProps {
  totalXp: number;
  className?: string;
}

export function XpSummaryCard({ totalXp, className }: XpSummaryCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Trophy className="h-4 w-4" />
          Experience Points
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatXpAmount(totalXp)}
            </span>
            <LevelBadge totalXp={totalXp} size="sm" showTitle />
          </div>
          <XpBar totalXp={totalXp} showRankTitle={false} compact />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Streak Card
// ============================================================================

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakCard({
  currentStreak,
  longestStreak,
  className,
}: StreakCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Flame className="h-4 w-4" />
          Activity Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StreakCounter
          currentStreak={currentStreak}
          longestStreak={longestStreak}
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Recent Badges Card
// ============================================================================

interface RecentBadgesCardProps {
  badges: UserBadgeWithDetails[];
  className?: string;
  /** Max badges to show */
  max?: number;
}

export function RecentBadgesCard({
  badges,
  className,
  max = 3,
}: RecentBadgesCardProps) {
  const recent = badges.slice(0, max);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Award className="h-4 w-4" />
          Recent Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No badges earned yet. Complete activities to unlock your first badge.
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((ub) => {
              const colors = getRarityColor(ub.badge.rarity);
              return (
                <div
                  key={ub.id}
                  className="flex items-center gap-3 rounded-md border border-slate-100 p-2 dark:border-slate-800"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-lg",
                      colors.bg
                    )}
                  >
                    {ub.badge.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {ub.badge.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(ub.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={cn("text-xs font-medium", colors.text)}>
                    +{ub.badge.xp_reward} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
