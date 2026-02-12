"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import type { Assignment, AssignmentSubmission, SubmissionFile } from "@/lib/domains/assignments/types";
import {
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
  formatDueDate,
  formatScore,
  isOverdue,
} from "@/lib/domains/assignments/utils";

interface SubmissionWithFiles extends AssignmentSubmission {
  files: SubmissionFile[];
}

export default function StudentAssignmentDetailPage() {
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const router = useRouter();
  const { courseId, assignmentId } = params;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<SubmissionWithFiles | null>(null);
  const [previousAttempts] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`);
      const json = await res.json();

      if (!res.ok) {
        console.error("Failed to load assignment:", json.error);
        return;
      }

      setAssignment(json.data);
    } catch (error) {
      console.error("Error loading assignment:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter your submission content");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to submit assignment");
        return;
      }

      toast.success("Assignment submitted successfully!");
      setSubmission({ ...json.data, files: [] });
      setContent("");
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast.error("Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <Link
          href={ROUTES.assignments(courseId)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">Assignment not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overdue = assignment.due_date && isOverdue(assignment.due_date);
  const hasSubmission = submission && submission.status !== "not_started";
  const isGraded = submission?.status === "graded";
  const isReturned = submission?.status === "returned";

  // Determine if student can still submit
  const completedAttempts = previousAttempts.filter(
    (a) =>
      a.status === "submitted" || a.status === "graded" || a.status === "returned"
  );
  const canSubmitMore =
    !assignment.max_attempts ||
    completedAttempts.length < assignment.max_attempts;
  const canSubmitNow =
    canSubmitMore &&
    (!overdue || assignment.allow_late_submissions) &&
    !hasSubmission;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.assignments(courseId)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {assignment.title}
            </h1>
            {assignment.description && (
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {assignment.description}
              </p>
            )}
          </div>
          {submission && (
            <Badge className={getSubmissionStatusColor(submission.status)}>
              {getSubmissionStatusLabel(submission.status)}
            </Badge>
          )}
        </div>
      </div>

      {/* Assignment Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 text-sm">
            {assignment.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Due Date</p>
                  <p
                    className={
                      overdue
                        ? "font-medium text-red-600 dark:text-red-400"
                        : ""
                    }
                  >
                    {new Date(assignment.due_date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDueDate(assignment.due_date)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Max Score</p>
                <p>{assignment.max_score} points</p>
              </div>
            </div>
            {assignment.max_attempts && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Attempts</p>
                  <p>
                    {completedAttempts.length} / {assignment.max_attempts}
                  </p>
                </div>
              </div>
            )}
            {assignment.allow_late_submissions && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-slate-500">Late Policy</p>
                  <p>
                    {assignment.late_penalty_percent}% penalty per day late
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {assignment.instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: assignment.instructions }}
            />
          </CardContent>
        </Card>
      )}

      {/* Rubric */}
      {assignment.rubric && assignment.rubric.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grading Rubric</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignment.rubric.map((criterion, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{criterion.name}</p>
                    <p className="text-sm text-slate-500">
                      {criterion.description}
                    </p>
                  </div>
                  <Badge variant="outline">{criterion.maxPoints} pts</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grading Result */}
      {isGraded && submission && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              Graded
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Score</p>
              <p className="text-2xl font-bold">
                {formatScore(
                  submission.score,
                  assignment.max_score,
                  submission.late_penalty_applied
                )}
              </p>
            </div>
            {submission.feedback && (
              <div>
                <p className="mb-1 text-sm text-slate-500">
                  Instructor Feedback
                </p>
                <div
                  className="prose prose-sm max-w-none rounded-md bg-slate-50 p-3 dark:bg-slate-900 dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: submission.feedback }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Returned for Revision */}
      {isReturned && submission && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-300">
              <AlertCircle className="h-5 w-5" />
              Returned for Revision
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission.feedback && (
              <div>
                <p className="mb-1 text-sm text-slate-500">
                  Instructor Feedback
                </p>
                <div
                  className="prose prose-sm max-w-none rounded-md bg-slate-50 p-3 dark:bg-slate-900 dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: submission.feedback }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previous Submission Content */}
      {hasSubmission && submission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.content && (
              <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-900">
                <pre className="whitespace-pre-wrap text-sm">
                  {submission.content}
                </pre>
              </div>
            )}
            {submission.files && submission.files.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-500">
                  Attached Files
                </p>
                <div className="space-y-2">
                  {submission.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 rounded border p-2 text-sm"
                    >
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span>{file.file_name}</span>
                      <span className="text-slate-400">
                        ({Math.round(file.file_size / 1024)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {submission.submitted_at && (
              <p className="text-xs text-slate-400">
                Submitted{" "}
                {new Date(submission.submitted_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {submission.late && (
                  <span className="ml-1 text-red-500">(Late)</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previous Attempts */}
      {previousAttempts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previous Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {previousAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded border p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      Attempt {attempt.attempt_number}
                    </span>
                    {attempt.submitted_at && (
                      <span className="ml-2 text-slate-500">
                        {new Date(attempt.submitted_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt.score !== null && (
                      <span>
                        {attempt.score}/{assignment.max_score}
                      </span>
                    )}
                    <Badge className={getSubmissionStatusColor(attempt.status)}>
                      {getSubmissionStatusLabel(attempt.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Form */}
      {(canSubmitNow || (isReturned && canSubmitMore)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isReturned ? "Resubmit Assignment" : "Submit Assignment"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdue && assignment.allow_late_submissions && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                This assignment is past due. A late penalty of{" "}
                {assignment.late_penalty_percent}% per day will be applied.
              </div>
            )}

            <div>
              <label
                htmlFor="submission-content"
                className="mb-1 block text-sm font-medium"
              >
                Your Response
              </label>
              <Textarea
                id="submission-content"
                placeholder="Enter your assignment response here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <Separator />

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(ROUTES.assignments(courseId))}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Assignment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cannot submit message */}
      {!canSubmitNow && !hasSubmission && !isReturned && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              {overdue && !assignment.allow_late_submissions
                ? "This assignment is past due and no longer accepts submissions."
                : !canSubmitMore
                  ? "You have used all available attempts for this assignment."
                  : "You cannot submit to this assignment at this time."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
