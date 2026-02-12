"use client";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LevelBadge } from "@/components/gamification/level-badge";
import { StreakCounter } from "@/components/gamification/streak-counter";
import { formatXpAmount } from "@/lib/domains/gamification/utils";
import type { LeaderboardEntry } from "@/lib/domains/gamification/types";
import { Medal, Award } from "lucide-react";

interface LeaderboardTableProps {
  allTimeEntries: LeaderboardEntry[];
  monthEntries: LeaderboardEntry[];
  currentUserId: string;
}

export function LeaderboardTable({
  allTimeEntries,
  monthEntries,
  currentUserId,
}: LeaderboardTableProps) {
  return (
    <Tabs defaultValue="all_time">
      <TabsList>
        <TabsTrigger value="all_time">All Time</TabsTrigger>
        <TabsTrigger value="this_month">This Month</TabsTrigger>
      </TabsList>

      <TabsContent value="all_time">
        <EntryList entries={allTimeEntries} currentUserId={currentUserId} />
      </TabsContent>

      <TabsContent value="this_month">
        {monthEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <Medal className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No activity this month yet. Be the first to earn XP!
            </p>
          </div>
        ) : (
          <EntryList entries={monthEntries} currentUserId={currentUserId} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function EntryList({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <Medal className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          No entries yet. Start earning XP to appear on the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              Veteran
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400 sm:table-cell">
              Level
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              XP
            </th>
            <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase text-slate-500 dark:text-slate-400 md:table-cell">
              Badges
            </th>
            <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase text-slate-500 dark:text-slate-400 md:table-cell">
              Streak
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrentUser = entry.user_id === currentUserId;
            const initials = entry.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <tr
                key={entry.user_id}
                className={cn(
                  "border-b transition-colors last:border-b-0",
                  isCurrentUser
                    ? "bg-indigo-50 dark:bg-indigo-900/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                )}
              >
                {/* Rank */}
                <td className="px-4 py-3">
                  <RankDisplay rank={entry.rank} />
                </td>

                {/* Name + Avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {entry.avatar_url ? (
                        <AvatarImage src={entry.avatar_url} alt={entry.full_name} />
                      ) : null}
                      <AvatarFallback className="bg-slate-200 text-xs font-medium dark:bg-slate-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isCurrentUser
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-slate-900 dark:text-white"
                        )}
                      >
                        {entry.full_name}
                        {isCurrentUser && (
                          <span className="ml-1 text-xs font-normal text-indigo-500">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                        {entry.level_title}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Level */}
                <td className="hidden px-4 py-3 sm:table-cell">
                  <LevelBadge totalXp={entry.total_xp} size="sm" showTitle />
                </td>

                {/* XP */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatXpAmount(entry.total_xp)}
                  </span>
                </td>

                {/* Badges */}
                <td className="hidden px-4 py-3 text-center md:table-cell">
                  <div className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <Award className="h-3.5 w-3.5" />
                    {entry.badge_count}
                  </div>
                </td>

                {/* Streak */}
                <td className="hidden px-4 py-3 text-center md:table-cell">
                  <StreakCounter
                    currentStreak={entry.current_streak}
                    longestStreak={0}
                    compact
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        3
      </span>
    );
  }

  return (
    <span className="inline-flex h-7 w-7 items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
      {rank}
    </span>
  );
}
