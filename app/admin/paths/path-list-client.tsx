"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import type { LearningPathWithStats } from "@/lib/domains/learning-paths/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  BookOpen,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";

interface PathListClientProps {
  initialPaths: LearningPathWithStats[];
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
};

export function PathListClient({ initialPaths }: PathListClientProps) {
  const router = useRouter();
  const [paths, setPaths] = useState(initialPaths);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = paths.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleStatusToggle(pathId: string, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/paths/${pathId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      setPaths((prev) =>
        prev.map((p) =>
          p.id === pathId ? { ...p, status: newStatus as "draft" | "published" } : p
        )
      );
      toast.success(`Path ${newStatus === "published" ? "published" : "set to draft"}`);
    } catch {
      toast.error("Failed to update path status");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/paths/${deleteTarget}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete path");
      }

      setPaths((prev) => prev.filter((p) => p.id !== deleteTarget));
      toast.success("Learning path deleted");
    } catch {
      toast.error("Failed to delete learning path");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Learning Paths</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage learning paths for students
          </p>
        </div>
        <Button asChild>
          <Link href={ROUTES.adminNewPath}>
            <Plus className="mr-2 h-4 w-4" />
            New Path
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search paths..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Layers className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium text-muted-foreground">
            {search ? "No paths match your search" : "No learning paths yet"}
          </p>
          {!search && (
            <Button asChild className="mt-4" variant="outline">
              <Link href={ROUTES.adminNewPath}>Create your first path</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-center">Courses</TableHead>
                <TableHead className="text-center">Enrollments</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((path) => {
                const statusInfo = STATUS_BADGE[path.status] || STATUS_BADGE.draft;
                return (
                  <TableRow key={path.id}>
                    <TableCell>
                      <Link
                        href={ROUTES.adminPath(path.id)}
                        className="font-medium hover:underline"
                      >
                        {path.title}
                      </Link>
                      {path.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {path.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {path.difficulty_level ? (
                        <span className="text-sm capitalize">
                          {path.difficulty_level}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1 text-sm">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        {path.course_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {path.enrollment_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={ROUTES.adminPath(path.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusToggle(path.id, path.status)
                            }
                          >
                            {path.status === "published"
                              ? "Unpublish"
                              : "Publish"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(path.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Learning Path?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this learning path and all its course
              associations and enrollments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
