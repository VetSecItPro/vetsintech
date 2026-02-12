"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants/routes";
import type { Assignment } from "@/lib/domains/assignments/types";
import type { SubmissionStatus } from "@/lib/domains/assignments/types";
import {
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
  formatDueDate,
  isOverdue,
} from "@/lib/domains/assignments/utils";

interface AssignmentWithStatus extends Assignment {
  student_status: SubmissionStatus;
  student_score: number | null;
}

export default function StudentAssignmentsPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [assignments, setAssignments] = useState<AssignmentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assignments?course_id=${courseId}`);
        const json = await res.json();

        if (!res.ok) {
          console.error("Failed to load assignments:", json.error);
          return;
        }

        // Only show published assignments to students
        const published = (json.data || []).filter(
          (a: Assignment) => a.status === "published"
        );

        // For each assignment, fetch the student's submission status
        const withStatus: AssignmentWithStatus[] = await Promise.all(
          published.map(async (assignment: Assignment) => {
            try {
              const subRes = await fetch(
                `/api/assignments/${assignment.id}/submissions`
              );
              // Students may not have access to list all submissions;
              // use individual check instead. For now, default to not_started.
              return {
                ...assignment,
                student_status: "not_started" as SubmissionStatus,
                student_score: null,
              };
            } catch {
              return {
                ...assignment,
                student_status: "not_started" as SubmissionStatus,
                student_score: null,
              };
            }
          })
        );

        setAssignments(withStatus);
      } catch (error) {
        console.error("Error loading assignments:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.course(courseId)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and submit your course assignments
        </p>
      </div>

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">
              No assignments available for this course yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const overdue =
              assignment.due_date && isOverdue(assignment.due_date);
            const statusColor =
              assignment.student_status === "not_started" && overdue
                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                : getSubmissionStatusColor(assignment.student_status);

            return (
              <Card key={assignment.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        <Link
                          href={ROUTES.assignment(courseId, assignment.id)}
                          className="hover:underline"
                        >
                          {assignment.title}
                        </Link>
                      </CardTitle>
                      {assignment.description && (
                        <p className="line-clamp-2 text-sm text-slate-500">
                          {assignment.description}
                        </p>
                      )}
                    </div>
                    <Badge className={statusColor}>
                      {overdue && assignment.student_status === "not_started"
                        ? "Overdue"
                        : getSubmissionStatusLabel(assignment.student_status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    {assignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDueDate(assignment.due_date)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {assignment.max_score} points
                    </span>
                    {assignment.max_attempts && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {assignment.max_attempts} attempt
                        {assignment.max_attempts !== 1 ? "s" : ""}
                      </span>
                    )}
                    {assignment.student_score !== null && (
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Score: {assignment.student_score}/{assignment.max_score}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <Button asChild size="sm">
                      <Link href={ROUTES.assignment(courseId, assignment.id)}>
                        {assignment.student_status === "not_started"
                          ? "Start Assignment"
                          : assignment.student_status === "graded"
                            ? "View Results"
                            : "View Assignment"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
