import type { StudentProgressRow } from "@/lib/domains/admin/types";
import { formatPercentage } from "@/lib/domains/admin/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentProgressTableProps {
  students: StudentProgressRow[];
}

function getProgressColor(value: number): string {
  if (value < 30) return "bg-red-500";
  if (value < 70) return "bg-amber-500";
  return "bg-green-500";
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  }
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return "Just now";
}

export function StudentProgressTable({
  students,
}: StudentProgressTableProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-lg font-medium text-muted-foreground">
          No student progress data
        </p>
        <p className="text-sm text-muted-foreground">
          Progress data will appear once students start their courses.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Cohort</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead className="text-center">Quiz Avg</TableHead>
          <TableHead>Last Activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={`${student.userId}-${student.courseTitle}`}>
            <TableCell className="font-medium">
              {student.fullName}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {student.email}
            </TableCell>
            <TableCell>{student.courseTitle}</TableCell>
            <TableCell className="text-muted-foreground">
              {student.cohortName || "--"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(student.progressPercentage)}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, student.progressPercentage))}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatPercentage(student.progressPercentage)}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              {formatPercentage(student.quizAvg)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatRelativeTime(student.lastActivityAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
