"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  Code,
  GraduationCap,
  RefreshCw,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  Award,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExternalPlatform = "coursera" | "pluralsight" | "udemy";

interface ExternalStudentProgress {
  userId: string;
  fullName: string;
  email: string;
  platform: ExternalPlatform;
  courseTitle: string;
  progressPercentage: number;
  status: string;
  lastActivityAt: string | null;
}

interface ProgressSummary {
  totalCourses: number;
  completedCourses: number;
  completionRate: number;
  platformCounts: Record<string, number>;
  mostActivePlatform: string | null;
}

type SortField =
  | "fullName"
  | "platform"
  | "courseTitle"
  | "progressPercentage"
  | "status"
  | "lastActivityAt";

type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_META: Record<
  ExternalPlatform,
  { label: string; icon: React.ReactNode; color: string }
> = {
  coursera: {
    label: "Coursera",
    icon: <GraduationCap className="h-4 w-4" />,
    color: "bg-blue-600",
  },
  pluralsight: {
    label: "Pluralsight",
    icon: <Code className="h-4 w-4" />,
    color: "bg-purple-600",
  },
  udemy: {
    label: "Udemy",
    icon: <BookOpen className="h-4 w-4" />,
    color: "bg-red-600",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString();
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 75) return "bg-blue-500";
  if (pct >= 50) return "bg-yellow-500";
  if (pct >= 25) return "bg-orange-500";
  return "bg-slate-500";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnifiedProgressDashboard() {
  const [progress, setProgress] = useState<ExternalStudentProgress[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("progressPercentage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/integrations/progress", window.location.origin);
      if (platformFilter !== "all") {
        url.searchParams.set("platform", platformFilter);
      }
      url.searchParams.set("limit", "200");

      const res = await fetch(url.toString());
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to fetch progress data");
        return;
      }

      setProgress(json.data.progress ?? []);
      setSummary(json.data.summary ?? null);
    } catch {
      toast.error("Failed to fetch progress data");
    } finally {
      setLoading(false);
    }
  }, [platformFilter]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Sort and filter
  const sortedProgress = useMemo(() => {
    const sorted = [...progress];
    sorted.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "fullName":
          aVal = a.fullName.toLowerCase();
          bVal = b.fullName.toLowerCase();
          break;
        case "platform":
          aVal = a.platform;
          bVal = b.platform;
          break;
        case "courseTitle":
          aVal = a.courseTitle.toLowerCase();
          bVal = b.courseTitle.toLowerCase();
          break;
        case "progressPercentage":
          aVal = a.progressPercentage;
          bVal = b.progressPercentage;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "lastActivityAt":
          aVal = a.lastActivityAt ?? "";
          bVal = b.lastActivityAt ?? "";
          break;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [progress, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    return (
      <ArrowUpDown
        className={`h-3 w-3 ml-1 ${sortDir === "asc" ? "rotate-180" : ""}`}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Courses
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {summary.totalCourses}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Across all platforms
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Completed
              </CardTitle>
              <Award className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {summary.completedCourses}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Courses finished
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Completion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {summary.completionRate}%
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${summary.completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Most Active
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white capitalize">
                {summary.mostActivePlatform ?? "N/A"}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Platform with most enrollments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Platform Breakdown Bar */}
      {summary && summary.totalCourses > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">
              Enrollments by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex w-full h-8 rounded-md overflow-hidden gap-0.5">
              {(
                Object.entries(summary.platformCounts) as [
                  ExternalPlatform,
                  number,
                ][]
              ).map(([platform, count]) => {
                const pct = Math.round(
                  (count / summary.totalCourses) * 100
                );
                const meta = PLATFORM_META[platform];
                if (!meta || pct === 0) return null;

                return (
                  <div
                    key={platform}
                    className={`${meta.color} flex items-center justify-center text-white text-xs font-medium transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${meta.label}: ${count} (${pct}%)`}
                  >
                    {pct >= 15 ? `${meta.label} ${pct}%` : pct >= 8 ? `${pct}%` : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3">
              {(
                Object.entries(summary.platformCounts) as [
                  ExternalPlatform,
                  number,
                ][]
              ).map(([platform, count]) => {
                const meta = PLATFORM_META[platform];
                if (!meta) return null;
                return (
                  <div
                    key={platform}
                    className="flex items-center gap-2 text-sm text-slate-400"
                  >
                    <div
                      className={`w-3 h-3 rounded-sm ${meta.color}`}
                    />
                    <span>
                      {meta.label}: {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-white text-base">
            Student Progress
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select
                value={platformFilter}
                onValueChange={setPlatformFilter}
              >
                <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">
                    All Platforms
                  </SelectItem>
                  <SelectItem value="coursera" className="text-white">
                    Coursera
                  </SelectItem>
                  <SelectItem value="pluralsight" className="text-white">
                    Pluralsight
                  </SelectItem>
                  <SelectItem value="udemy" className="text-white">
                    Udemy
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProgress}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-800/50">
                <TableHead
                  className="text-slate-300 cursor-pointer select-none"
                  onClick={() => handleSort("fullName")}
                >
                  <span className="flex items-center">
                    Student <SortIcon field="fullName" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-slate-300 cursor-pointer select-none"
                  onClick={() => handleSort("platform")}
                >
                  <span className="flex items-center">
                    Platform <SortIcon field="platform" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-slate-300 cursor-pointer select-none"
                  onClick={() => handleSort("courseTitle")}
                >
                  <span className="flex items-center">
                    Course <SortIcon field="courseTitle" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-slate-300 cursor-pointer select-none"
                  onClick={() => handleSort("progressPercentage")}
                >
                  <span className="flex items-center">
                    Progress <SortIcon field="progressPercentage" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-slate-300 cursor-pointer select-none"
                  onClick={() => handleSort("status")}
                >
                  <span className="flex items-center">
                    Status <SortIcon field="status" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-slate-300 cursor-pointer select-none"
                  onClick={() => handleSort("lastActivityAt")}
                >
                  <span className="flex items-center">
                    Last Activity <SortIcon field="lastActivityAt" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProgress.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell
                    colSpan={6}
                    className="text-center text-slate-500 py-8"
                  >
                    No external progress data yet. Connect a platform and
                    sync to see student progress.
                  </TableCell>
                </TableRow>
              ) : (
                sortedProgress.map((row, i) => {
                  const meta = PLATFORM_META[row.platform];
                  return (
                    <TableRow
                      key={`${row.userId}-${row.platform}-${row.courseTitle}-${i}`}
                      className="border-slate-800 hover:bg-slate-800/50"
                    >
                      <TableCell>
                        <div>
                          <div className="text-white text-sm">
                            {row.fullName}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {row.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {meta && (
                          <Badge
                            className={`${meta.color} text-white border-0 gap-1.5`}
                          >
                            {meta.icon}
                            {meta.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-[200px] truncate">
                        {row.courseTitle}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProgressColor(row.progressPercentage)}`}
                              style={{
                                width: `${row.progressPercentage}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-white min-w-[3ch] text-right">
                            {row.progressPercentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            row.status === "completed"
                              ? "bg-green-600 hover:bg-green-700"
                              : ""
                          }
                        >
                          {row.status === "completed"
                            ? "Completed"
                            : "In Progress"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDate(row.lastActivityAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
