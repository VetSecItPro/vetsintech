"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import type {
  Assignment,
  AssignmentStatus,
} from "@/lib/domains/assignments/types";
import { formatDueDate } from "@/lib/domains/assignments/utils";

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  published:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archived:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

interface AssignmentWithCounts extends Assignment {
  submission_count?: number;
  graded_count?: number;
}

export default function AdminAssignmentsPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const courseId = params.courseId;

  const [assignments, setAssignments] = useState<AssignmentWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [dueDate, setDueDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [allowLate, setAllowLate] = useState(false);
  const [latePenalty, setLatePenalty] = useState("10");

  const loadAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments?course_id=${courseId}`);
      const json = await res.json();
      if (res.ok) {
        setAssignments(json.data || []);
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setInstructions("");
    setMaxScore("100");
    setDueDate("");
    setMaxAttempts("1");
    setAllowLate(false);
    setLatePenalty("10");
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        course_id: courseId,
        title: title.trim(),
        max_score: Number(maxScore) || 100,
        max_attempts: Number(maxAttempts) || 1,
        allow_late_submissions: allowLate,
        late_penalty_percent: allowLate ? Number(latePenalty) || 0 : 0,
      };
      if (description.trim()) body.description = description.trim();
      if (instructions.trim()) body.instructions = instructions.trim();
      if (dueDate) body.due_date = new Date(dueDate).toISOString();

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Failed to create assignment");
        return;
      }

      toast.success("Assignment created!");
      setShowCreate(false);
      resetForm();
      loadAssignments();
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (
    assignmentId: string,
    currentStatus: AssignmentStatus
  ) => {
    const newStatus: AssignmentStatus =
      currentStatus === "published" ? "draft" : "published";

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(
          `Assignment ${newStatus === "published" ? "published" : "unpublished"}`
        );
        loadAssignments();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/assignments/${deleteTarget}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Assignment deleted");
        loadAssignments();
      } else {
        toast.error("Failed to delete assignment");
      }
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.adminModules(courseId)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage assignments for this course
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        </div>
      </div>

      {/* Assignment Table */}
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-slate-500">
              No assignments yet. Create your first assignment to get started.
            </p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Max Score</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Link
                      href={ROUTES.adminAssignment(courseId, assignment.id)}
                      className="font-medium hover:underline"
                    >
                      {assignment.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[assignment.status]}>
                      {assignment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {assignment.due_date
                      ? formatDueDate(assignment.due_date)
                      : "No due date"}
                  </TableCell>
                  <TableCell>{assignment.max_score}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {assignment.submission_count || 0}
                      {assignment.graded_count
                        ? ` (${assignment.graded_count} graded)`
                        : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            ROUTES.adminAssignment(courseId, assignment.id)
                          )
                        }
                        title="View / Edit"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleStatus(assignment.id, assignment.status)
                        }
                        title={
                          assignment.status === "published"
                            ? "Unpublish"
                            : "Publish"
                        }
                      >
                        {assignment.status === "published" ? (
                          <Pencil className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(assignment.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assignment title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Detailed instructions for students"
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-score">Max Score</Label>
                <Input
                  id="max-score"
                  type="number"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="max-attempts">Max Attempts</Label>
                <Input
                  id="max-attempts"
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-late">Allow Late Submissions</Label>
              <Switch
                id="allow-late"
                checked={allowLate}
                onCheckedChange={setAllowLate}
              />
            </div>
            {allowLate && (
              <div>
                <Label htmlFor="late-penalty">
                  Late Penalty (% per day)
                </Label>
                <Input
                  id="late-penalty"
                  type="number"
                  value={latePenalty}
                  onChange={(e) => setLatePenalty(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this assignment and all student
              submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
