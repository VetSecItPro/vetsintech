"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { CourseWithStats, CourseStatus } from "@/lib/domains/courses/types";
import { ROUTES } from "@/lib/constants/routes";
import { CourseTable } from "@/components/admin/course-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

interface CourseListClientProps {
  initialCourses: CourseWithStats[];
  categories: string[];
}

const ALL_VALUE = "__all__";

export function CourseListClient({
  initialCourses,
  categories,
}: CourseListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_VALUE);
  const [deletingId, setDeletingId] = useState<string | undefined>();

  const filteredCourses = useMemo(() => {
    let result = initialCourses;

    if (statusFilter !== ALL_VALUE) {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (categoryFilter !== ALL_VALUE) {
      result = result.filter((c) => c.category === categoryFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          (c.description && c.description.toLowerCase().includes(term))
      );
    }

    return result;
  }, [initialCourses, search, statusFilter, categoryFilter]);

  async function handleDelete(courseId: string) {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return;
    }

    setDeletingId(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete course");
      }

      toast.success("Course deleted successfully");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete course";
      toast.error(message);
    } finally {
      setDeletingId(undefined);
    }
  }

  async function handleStatusChange(courseId: string, status: CourseStatus) {
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to ${status} course`);
      }

      toast.success(`Course ${status === "published" ? "published" : "archived"} successfully`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operation failed";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s course catalog.
          </p>
        </div>
        <Button asChild>
          <Link href={ROUTES.adminNewCourse}>
            <Plus />
            New Course
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <CourseTable
        courses={filteredCourses}
        onDelete={handleDelete}
        onPublish={(id) => handleStatusChange(id, "published")}
        onArchive={(id) => handleStatusChange(id, "archived")}
        isDeleting={deletingId}
      />
    </div>
  );
}
