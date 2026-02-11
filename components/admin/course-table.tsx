"use client";

import Link from "next/link";
import type { CourseWithStats, CourseStatus } from "@/lib/domains/courses/types";
import { ROUTES } from "@/lib/constants/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  Globe,
  Layers,
} from "lucide-react";

interface CourseTableProps {
  courses: CourseWithStats[];
  onDelete: (id: string) => void;
  onPublish?: (id: string) => void;
  onArchive?: (id: string) => void;
  isDeleting?: string;
}

const STATUS_STYLES: Record<CourseStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archived: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CourseTable({
  courses,
  onDelete,
  onPublish,
  onArchive,
  isDeleting,
}: CourseTableProps) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <Layers className="mb-3 size-10 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">
          No courses found
        </p>
        <p className="text-sm text-muted-foreground">
          Create your first course to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-center">Modules</TableHead>
          <TableHead className="text-center">Cohorts</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[50px]">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id}>
            <TableCell className="font-medium">{course.title}</TableCell>
            <TableCell className="text-muted-foreground">
              {course.category || "--"}
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={STATUS_STYLES[course.status]}
              >
                {course.status}
              </Badge>
            </TableCell>
            <TableCell className="text-center">{course.module_count}</TableCell>
            <TableCell className="text-center">{course.cohort_count}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(course.created_at)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isDeleting === course.id}
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.adminEditCourse(course.id)}>
                      <Pencil />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.adminModules(course.id)}>
                      <Layers />
                      Manage Modules
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {course.status !== "published" && onPublish && (
                    <DropdownMenuItem onClick={() => onPublish(course.id)}>
                      <Globe />
                      Publish
                    </DropdownMenuItem>
                  )}
                  {course.status !== "archived" && onArchive && (
                    <DropdownMenuItem onClick={() => onArchive(course.id)}>
                      <Archive />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(course.id)}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
