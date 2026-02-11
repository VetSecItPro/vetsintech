import type { CourseAnalytics } from "@/lib/domains/admin/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercentage } from "@/lib/domains/admin/utils";

interface CourseAnalyticsTableProps {
  courseAnalytics: CourseAnalytics[];
}

const COMPLETION_STYLES: Record<string, string> = {
  low: "bg-red-500/10 text-red-400 border-red-500/20",
  mid: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-green-500/10 text-green-400 border-green-500/20",
};

function getCompletionTier(rate: number): string {
  if (rate < 30) return "low";
  if (rate < 70) return "mid";
  return "high";
}

function getProgressColor(value: number): string {
  if (value < 30) return "bg-red-500";
  if (value < 70) return "bg-amber-500";
  return "bg-green-500";
}

export function CourseAnalyticsTable({
  courseAnalytics,
}: CourseAnalyticsTableProps) {
  // Sort by completion rate (lowest first) to highlight problem courses
  const sorted = [...courseAnalytics].sort(
    (a, b) => a.completionRate - b.completionRate
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-lg font-medium text-muted-foreground">
          No course analytics available
        </p>
        <p className="text-sm text-muted-foreground">
          Analytics will appear once students begin enrolling in courses.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Course Title</TableHead>
          <TableHead className="text-center">Enrolled</TableHead>
          <TableHead>Completion Rate</TableHead>
          <TableHead>Avg Progress</TableHead>
          <TableHead className="text-center">Avg Quiz Score</TableHead>
          <TableHead>Drop-off Lesson</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((course) => {
          const tier = getCompletionTier(course.completionRate);
          return (
            <TableRow key={course.courseId}>
              <TableCell className="font-medium">
                {course.courseTitle}
              </TableCell>
              <TableCell className="text-center">
                {course.totalEnrolled}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={COMPLETION_STYLES[tier]}
                >
                  {formatPercentage(course.completionRate)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(course.avgProgress)}`}
                      style={{
                        width: `${Math.min(100, Math.max(0, course.avgProgress))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatPercentage(course.avgProgress)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {formatPercentage(course.avgQuizScore)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {course.dropOffLesson ?? "--"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
