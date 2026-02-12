"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

interface PathCourse {
  id: string;
  course_id: string;
  position: number;
  is_required: boolean;
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail_url: string | null;
    estimated_duration_minutes: number | null;
    status: string;
  };
}

interface AvailableCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
}

interface PathCourseManagerProps {
  pathId: string;
}

export function PathCourseManager({ pathId }: PathCourseManagerProps) {
  const [courses, setCourses] = useState<PathCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>(
    []
  );
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [coursesRes, allCoursesRes] = await Promise.all([
        fetch(`/api/paths/${pathId}/courses`),
        fetch("/api/courses"),
      ]);

      if (coursesRes.ok) {
        const body = await coursesRes.json();
        setCourses(body.data || []);
      }

      if (allCoursesRes.ok) {
        const body = await allCoursesRes.json();
        setAvailableCourses(body.data || []);
      }
    } catch {
      toast.error("Failed to load course data");
    } finally {
      setIsLoading(false);
    }
  }, [pathId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addedCourseIds = new Set(courses.map((c) => c.course_id));
  const selectableCourses = availableCourses.filter(
    (c) => !addedCourseIds.has(c.id)
  );

  async function handleAddCourse() {
    if (!selectedCourseId) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/paths/${pathId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courses: [{ course_id: selectedCourseId }],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add course");
      }

      setSelectedCourseId("");
      toast.success("Course added to path");
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add course";
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveCourse(courseId: string) {
    try {
      const res = await fetch(`/api/paths/${pathId}/courses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove_course_id: courseId }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove course");
      }

      setCourses((prev) => prev.filter((c) => c.course_id !== courseId));
      toast.success("Course removed from path");
    } catch {
      toast.error("Failed to remove course");
    }
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= courses.length) return;

    const newCourses = [...courses];
    const [moved] = newCourses.splice(fromIndex, 1);
    newCourses.splice(toIndex, 0, moved);

    // Optimistic update
    setCourses(newCourses);

    try {
      const courseIds = newCourses.map((c) => c.course_id);
      const res = await fetch(`/api/paths/${pathId}/courses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_ids: courseIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to reorder courses");
      }
    } catch {
      toast.error("Failed to reorder courses");
      // Revert on error
      await fetchData();
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Sequence</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading courses...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Sequence</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add courses and drag to reorder. Students will progress through courses
          in this order.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add course */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Add a Course</label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={isAdding}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course to add" />
              </SelectTrigger>
              <SelectContent>
                {selectableCourses.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No courses available
                  </SelectItem>
                ) : (
                  selectableCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddCourse}
            disabled={!selectedCourseId || isAdding}
            size="sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            {isAdding ? "Adding..." : "Add"}
          </Button>
        </div>

        {/* Course list */}
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No courses in this path yet
            </p>
            <p className="text-xs text-muted-foreground">
              Use the selector above to add courses
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {courses.map((pc, index) => (
              <div
                key={pc.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-medium text-slate-300">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {pc.course.title}
                  </p>
                  {pc.course.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {pc.course.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleReorder(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleReorder(index, index + 1)}
                    disabled={index === courses.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveCourse(pc.course_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
