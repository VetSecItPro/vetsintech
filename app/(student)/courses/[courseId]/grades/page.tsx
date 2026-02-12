"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants/routes";
import type { StudentGradeSummary, CategoryGradeSummary } from "@/lib/domains/gradebook/types";
import {
  formatGradePercentage,
  getGradeColor,
  getGradeBgColor,
  getCategoryLabel,
} from "@/lib/domains/gradebook/utils";

export default function StudentGradesPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [grades, setGrades] = useState<StudentGradeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const loadGrades = useCallback(async () => {
    try {
      const res = await fetch(`/api/gradebook/${courseId}`);
      const json = await res.json();
      if (res.ok) {
        setGrades(json.data);
      }
    } catch (error) {
      console.error("Error loading grades:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!grades) {
    return (
      <div className="space-y-4">
        <Link
          href={ROUTES.course(courseId)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-slate-500">
              No grades available yet. Complete quizzes and assignments to see
              your grades here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={ROUTES.course(courseId)}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Course
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>

      {/* Overall Grade Card */}
      <Card>
        <CardContent className="flex items-center gap-8 pt-6">
          <div className="flex flex-col items-center">
            <div
              className={`text-5xl font-bold ${getGradeColor(grades.letterGrade)}`}
            >
              {grades.letterGrade}
            </div>
            <p className="mt-1 text-sm text-slate-500">Letter Grade</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold">
              {formatGradePercentage(grades.overallPercentage)}
            </div>
            <p className="mt-1 text-sm text-slate-500">Overall</p>
          </div>
          <div className="ml-auto">
            <Award className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Grade Breakdown</h2>

        {grades.categories.map((cat) => (
          <CategoryCard
            key={cat.category}
            category={cat}
            isExpanded={expandedCategories.has(cat.category)}
            onToggle={() => toggleCategory(cat.category)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  isExpanded,
  onToggle,
}: {
  category: CategoryGradeSummary;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasItems = category.items.length > 0;
  const percentage = hasItems ? category.percentage : 0;
  const barWidth = Math.min(100, Math.max(0, percentage));

  // Determine bar color based on percentage
  const getBarColor = (pct: number) => {
    if (pct >= 90) return "bg-green-500";
    if (pct >= 80) return "bg-blue-500";
    if (pct >= 70) return "bg-yellow-500";
    if (pct >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
        type="button"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <span className="font-medium">
              {getCategoryLabel(category.category)}
            </span>
            <span className="ml-2 text-sm text-slate-500">
              ({category.weight}% of total)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasItems ? (
            <>
              {/* Progress bar */}
              <div className="hidden w-32 sm:block">
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-2 rounded-full transition-all ${getBarColor(percentage)}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <span className="min-w-[4rem] text-right font-semibold">
                {formatGradePercentage(percentage)}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">No items yet</span>
          )}
        </div>
      </button>

      {isExpanded && hasItems && (
        <CardContent className="border-t pt-4">
          <div className="space-y-2">
            {category.items.map((item) => {
              const itemPct =
                item.max_score > 0
                  ? (item.score / item.max_score) * 100
                  : 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs capitalize"
                    >
                      {item.type}
                    </Badge>
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">
                      {item.score}/{item.max_score}
                    </span>
                    <Badge className={getGradeBgColor(letterFromPct(itemPct))}>
                      {formatGradePercentage(itemPct)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}

      {isExpanded && !hasItems && (
        <CardContent className="border-t pt-4">
          <p className="text-sm text-slate-500">
            No graded items in this category yet.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

/** Quick helper to get letter grade from a percentage for badge display */
function letterFromPct(pct: number): string {
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
}
