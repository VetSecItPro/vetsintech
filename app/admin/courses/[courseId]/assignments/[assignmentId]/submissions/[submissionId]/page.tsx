"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  RotateCcw,
  FileText,
  Upload,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import type {
  Assignment,
  SubmissionFile,
  RubricCriterion,
} from "@/lib/domains/assignments/types";
import type { SubmissionStatus } from "@/lib/domains/assignments/types";
import {
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
} from "@/lib/domains/assignments/utils";

interface SubmissionDetail {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  submitted_at: string | null;
  status: SubmissionStatus;
  attempt_number: number;
  score: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  late: boolean;
  late_penalty_applied: number;
  files: SubmissionFile[];
}

export default function GradeSubmissionPage() {
  const params = useParams<{
    courseId: string;
    assignmentId: string;
    submissionId: string;
  }>();
  const router = useRouter();
  const { courseId, assignmentId, submissionId } = params;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [returning, setReturning] = useState(false);

  // Grading form state
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rubricScores, setRubricScores] = useState<Map<number, string>>(
    new Map()
  );

  const loadData = useCallback(async () => {
    try {
      const [assignmentRes, submissionRes] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`),
        fetch(
          `/api/assignments/${assignmentId}/submissions/${submissionId}`
        ),
      ]);

      const assignmentJson = await assignmentRes.json();
      if (assignmentRes.ok) {
        setAssignment(assignmentJson.data);

        // Initialize rubric scores
        if (assignmentJson.data.rubric) {
          const initial = new Map<number, string>();
          assignmentJson.data.rubric.forEach(
            (_: RubricCriterion, idx: number) => {
              initial.set(idx, "0");
            }
          );
          setRubricScores(initial);
        }
      }

      const submissionJson = await submissionRes.json();
      if (submissionRes.ok) {
        const sub = submissionJson.data as SubmissionDetail;
        setSubmission(sub);
        if (sub.score !== null) {
          setScore(String(sub.score));
        }
        if (sub.feedback) {
          setFeedback(sub.feedback);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, submissionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateRubricTotal = (): number => {
    let total = 0;
    rubricScores.forEach((val) => {
      total += Number(val) || 0;
    });
    return total;
  };

  const handleGrade = async () => {
    const scoreNum = Number(score);
    if (isNaN(scoreNum) || scoreNum < 0) {
      toast.error("Please enter a valid score");
      return;
    }

    if (assignment && scoreNum > assignment.max_score) {
      toast.error(`Score cannot exceed ${assignment.max_score}`);
      return;
    }

    setGrading(true);
    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}/submissions/${submissionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "grade",
            score: scoreNum,
            feedback: feedback.trim() || null,
          }),
        }
      );

      const json = await res.json();
      if (res.ok) {
        toast.success("Submission graded successfully");
        setSubmission(json.data);
      } else {
        toast.error(json.error || "Failed to grade submission");
      }
    } catch (error) {
      console.error("Error grading:", error);
      toast.error("Failed to grade submission");
    } finally {
      setGrading(false);
    }
  };

  const handleReturn = async () => {
    if (!feedback.trim()) {
      toast.error("Please provide feedback when returning a submission");
      return;
    }

    setReturning(true);
    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}/submissions/${submissionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "return",
            feedback: feedback.trim(),
          }),
        }
      );

      const json = await res.json();
      if (res.ok) {
        toast.success("Submission returned to student");
        setSubmission(json.data);
      } else {
        toast.error(json.error || "Failed to return submission");
      }
    } catch (error) {
      console.error("Error returning:", error);
      toast.error("Failed to return submission");
    } finally {
      setReturning(false);
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

  if (!assignment || !submission) {
    return (
      <div className="space-y-6">
        <Link
          href={ROUTES.adminAssignment(courseId, assignmentId)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignment
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm text-slate-500">Submission not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlreadyGraded =
    submission.status === "graded" || submission.status === "returned";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.adminAssignment(courseId, assignmentId)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {assignment.title}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Grade Submission
          </h1>
          <Badge className={getSubmissionStatusColor(submission.status)}>
            {getSubmissionStatusLabel(submission.status)}
          </Badge>
        </div>
      </div>

      {/* Submission Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Student</p>
                <p className="font-medium">Student ID: {submission.student_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Submitted</p>
                <p>
                  {submission.submitted_at
                    ? new Date(submission.submitted_at).toLocaleString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )
                    : "Not submitted"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Attempt</p>
                <p>
                  {submission.attempt_number}
                  {assignment.max_attempts
                    ? ` / ${assignment.max_attempts}`
                    : ""}
                </p>
              </div>
            </div>
            {submission.late && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-slate-500">Late Penalty</p>
                  <p className="text-red-600">
                    {submission.late_penalty_applied}% applied
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submission Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submission.content ? (
            <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-900">
              <pre className="whitespace-pre-wrap text-sm">
                {submission.content}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No text content submitted.</p>
          )}

          {submission.files && submission.files.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Attached Files</p>
              <div className="space-y-2">
                {submission.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 rounded border p-2 text-sm"
                  >
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{file.file_name}</span>
                    <span className="text-slate-400">
                      ({Math.round(file.file_size / 1024)} KB)
                    </span>
                    <span className="text-slate-400">{file.file_type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rubric Scoring */}
      {assignment.rubric && assignment.rubric.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rubric Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.rubric.map((criterion, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-4 rounded-md border p-3"
              >
                <div className="flex-1">
                  <p className="font-medium">{criterion.name}</p>
                  <p className="text-sm text-slate-500">
                    {criterion.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    min={0}
                    max={criterion.maxPoints}
                    value={rubricScores.get(index) || "0"}
                    onChange={(e) => {
                      const newScores = new Map(rubricScores);
                      newScores.set(index, e.target.value);
                      setRubricScores(newScores);
                      // Auto-update total score
                      let total = 0;
                      newScores.forEach((val) => {
                        total += Number(val) || 0;
                      });
                      setScore(String(total));
                    }}
                  />
                  <span className="text-sm text-slate-500">
                    / {criterion.maxPoints}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-end text-sm font-medium">
              Total: {calculateRubricTotal()} / {assignment.max_score}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grading Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAlreadyGraded ? "Update Grade" : "Grade Submission"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="score">
              Score (out of {assignment.max_score})
            </Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={assignment.max_score}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder={`0 - ${assignment.max_score}`}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback for the student..."
              rows={6}
            />
          </div>

          <Separator />

          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleReturn}
              disabled={returning || grading}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {returning ? "Returning..." : "Return for Revision"}
            </Button>
            <Button onClick={handleGrade} disabled={grading || returning}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {grading
                ? "Grading..."
                : isAlreadyGraded
                  ? "Update Grade"
                  : "Grade & Return"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
