"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import type {
  Assignment,
  AssignmentStatus,
  SubmissionWithStudent,
} from "@/lib/domains/assignments/types";
import {
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
  formatDueDate,
} from "@/lib/domains/assignments/utils";

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  published:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archived:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export default function AdminAssignmentDetailPage() {
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const router = useRouter();
  const { courseId, assignmentId } = params;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [dueDate, setDueDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [allowLate, setAllowLate] = useState(false);
  const [latePenalty, setLatePenalty] = useState("0");

  const loadData = useCallback(async () => {
    try {
      const [assignmentRes, submissionsRes] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`),
        fetch(`/api/assignments/${assignmentId}/submissions`),
      ]);

      const assignmentJson = await assignmentRes.json();
      if (assignmentRes.ok && assignmentJson.data) {
        const a = assignmentJson.data as Assignment;
        setAssignment(a);
        setTitle(a.title);
        setDescription(a.description || "");
        setInstructions(a.instructions || "");
        setMaxScore(String(a.max_score));
        setDueDate(
          a.due_date
            ? new Date(a.due_date).toISOString().slice(0, 16)
            : ""
        );
        setMaxAttempts(a.max_attempts ? String(a.max_attempts) : "1");
        setAllowLate(a.allow_late_submissions);
        setLatePenalty(String(a.late_penalty_percent));
      }

      const submissionsJson = await submissionsRes.json();
      if (submissionsRes.ok) {
        setSubmissions(submissionsJson.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        max_score: Number(maxScore) || 100,
        max_attempts: Number(maxAttempts) || 1,
        allow_late_submissions: allowLate,
        late_penalty_percent: allowLate ? Number(latePenalty) || 0 : 0,
      };
      if (dueDate) {
        body.due_date = new Date(dueDate).toISOString();
      } else {
        body.due_date = null;
      }

      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Assignment updated");
        setAssignment(json.data);
      } else {
        toast.error(json.error || "Failed to update assignment");
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!assignment) return;

    const newStatus: AssignmentStatus =
      assignment.status === "published" ? "draft" : "published";

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(
          newStatus === "published"
            ? "Assignment published"
            : "Assignment unpublished"
        );
        setAssignment(json.data);
      }
    } catch (error) {
      console.error("Error toggling status:", error);
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
        <p>Assignment not found.</p>
      </div>
    );
  }

  const submittedCount = submissions.filter(
    (s) => s.status !== "not_started" && s.status !== "draft"
  ).length;
  const gradedCount = submissions.filter(
    (s) => s.status === "graded" || s.status === "returned"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.adminAssignments(courseId)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {assignment.title}
            </h1>
            <Badge className={STATUS_COLORS[assignment.status]}>
              {assignment.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleToggleStatus}>
              {assignment.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-2xl font-bold">{assignment.max_score}</p>
                <p className="text-xs text-slate-500">Max Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-2xl font-bold">{submittedCount}</p>
                <p className="text-xs text-slate-500">Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-2xl font-bold">{gradedCount}</p>
                <p className="text-xs text-slate-500">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">
                  {assignment.due_date
                    ? formatDueDate(assignment.due_date)
                    : "No due date"}
                </p>
                <p className="text-xs text-slate-500">Due Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Edit / Submissions */}
      <Tabs defaultValue="submissions">
        <TabsList>
          <TabsTrigger value="submissions">
            Submissions ({submittedCount})
          </TabsTrigger>
          <TabsTrigger value="edit">Edit Assignment</TabsTrigger>
        </TabsList>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="mt-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-3 h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No submissions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {submission.student.full_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {submission.student.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getSubmissionStatusColor(
                            submission.status
                          )}
                        >
                          {getSubmissionStatusLabel(submission.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {submission.submitted_at
                          ? new Date(
                              submission.submitted_at
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>{submission.attempt_number}</TableCell>
                      <TableCell>
                        {submission.score !== null
                          ? `${submission.score}/${assignment.max_score}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {submission.late ? (
                          <Badge variant="outline" className="text-red-500">
                            Late
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              ROUTES.adminGradeSubmission(
                                courseId,
                                assignmentId,
                                submission.id
                              )
                            )
                          }
                        >
                          {submission.status === "submitted"
                            ? "Grade"
                            : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-instructions">Instructions</Label>
                <Textarea
                  id="edit-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-max-score">Max Score</Label>
                  <Input
                    id="edit-max-score"
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max-attempts">Max Attempts</Label>
                  <Input
                    id="edit-max-attempts"
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-due-date">Due Date</Label>
                <Input
                  id="edit-due-date"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-allow-late">
                  Allow Late Submissions
                </Label>
                <Switch
                  id="edit-allow-late"
                  checked={allowLate}
                  onCheckedChange={setAllowLate}
                />
              </div>
              {allowLate && (
                <div>
                  <Label htmlFor="edit-late-penalty">
                    Late Penalty (% per day)
                  </Label>
                  <Input
                    id="edit-late-penalty"
                    type="number"
                    value={latePenalty}
                    onChange={(e) => setLatePenalty(e.target.value)}
                  />
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
