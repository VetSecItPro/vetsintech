import type { ExternalStudentProgress } from "@/lib/domains/integrations/types";
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

interface ExternalProgressTableProps {
  data: ExternalStudentProgress[];
}

const PLATFORM_BADGE_STYLES: Record<string, string> = {
  coursera: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pluralsight: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  udemy: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

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

export function ExternalProgressTable({ data }: ExternalProgressTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-lg font-medium text-muted-foreground">
          No external platform data
        </p>
        <p className="text-sm text-muted-foreground">
          Configure and sync an external platform to see student progress here.
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
          <TableHead>Platform</TableHead>
          <TableHead>Course Title</TableHead>
          <TableHead className="text-center">Progress %</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={`${row.userId}-${row.platform}-${row.courseTitle}`}>
            <TableCell className="font-medium">{row.fullName}</TableCell>
            <TableCell className="text-muted-foreground">
              {row.email}
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={
                  PLATFORM_BADGE_STYLES[row.platform] ??
                  "bg-slate-500/10 text-slate-400 border-slate-500/20"
                }
              >
                {row.platform}
              </Badge>
            </TableCell>
            <TableCell>{row.courseTitle}</TableCell>
            <TableCell className="text-center">
              {formatPercentage(row.progressPercentage)}
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={
                  STATUS_BADGE_STYLES[row.status] ??
                  "bg-slate-500/10 text-slate-400 border-slate-500/20"
                }
              >
                {row.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatRelativeTime(row.lastActivityAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
