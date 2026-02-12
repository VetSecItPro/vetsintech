import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { getLeaderboard } from "@/lib/domains/gamification/queries";
import { getUserXpTotal, getUserStreak } from "@/lib/domains/gamification/queries";
import { calculateLevel, getLevelTitle, formatXpAmount } from "@/lib/domains/gamification/utils";
import { LeaderboardTable } from "./leaderboard-table";
import { XpBar } from "@/components/gamification/xp-bar";
import { StreakCounter } from "@/components/gamification/streak-counter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export const metadata = {
  title: "Leaderboard",
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) redirect(ROUTES.login);

  // Fetch data in parallel
  const [allTimeEntries, monthEntries, totalXp, streak] = await Promise.all([
    getLeaderboard(profile.organization_id, { limit: 50, period: "all_time" }),
    getLeaderboard(profile.organization_id, { limit: 50, period: "this_month" }),
    getUserXpTotal(user.id, profile.organization_id),
    getUserStreak(user.id, profile.organization_id),
  ]);

  const level = calculateLevel(totalXp);
  const userAllTimeRank =
    allTimeEntries.findIndex((e) => e.user_id === user.id) + 1 || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-slate-500">
          See how you stack up against your fellow veterans
        </p>
      </div>

      {/* User stats cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Rank card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Trophy className="h-4 w-4" />
              Your Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {userAllTimeRank ? `#${userAllTimeRank}` : "---"}
            </p>
            <p className="text-xs text-slate-500">
              {getLevelTitle(level)} ({formatXpAmount(totalXp)})
            </p>
          </CardContent>
        </Card>

        {/* XP progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              XP Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <XpBar totalXp={totalXp} compact />
          </CardContent>
        </Card>

        {/* Streak */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StreakCounter
              currentStreak={streak?.current_streak ?? 0}
              longestStreak={streak?.longest_streak ?? 0}
              compact
            />
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard table with tabs */}
      <LeaderboardTable
        allTimeEntries={allTimeEntries}
        monthEntries={monthEntries}
        currentUserId={user.id}
      />
    </div>
  );
}
