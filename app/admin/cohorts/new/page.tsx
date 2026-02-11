"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import { cohortSchema } from "@/lib/utils/validation";
import type { Course } from "@/lib/domains/courses/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewCohortPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchCourses() {
      const res = await fetch("/api/courses?status=published");
      if (res.ok) {
        const { data } = await res.json();
        setCourses(data);
      }
    }
    fetchCourses();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      course_id: formData.get("course_id") as string,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      starts_at: (formData.get("starts_at") as string) || undefined,
      ends_at: (formData.get("ends_at") as string) || undefined,
      max_students: formData.get("max_students")
        ? parseInt(formData.get("max_students") as string, 10)
        : undefined,
    };

    const result = cohortSchema.safeParse(raw);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to create cohort");
      }

      toast.success("Cohort created");
      router.push(ROUTES.adminCohorts);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create cohort"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.adminCohorts}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cohorts
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create Cohort</CardTitle>
          <CardDescription>
            Create a new cohort to enroll students into a published course
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select name="course_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.course_id && (
                <p className="text-sm text-red-600">{fieldErrors.course_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Cohort Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Spring 2026 Cohort"
                required
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of this cohort..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starts_at">Start Date (optional)</Label>
                <Input id="starts_at" name="starts_at" type="date" />
                {fieldErrors.starts_at && (
                  <p className="text-sm text-red-600">{fieldErrors.starts_at}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends_at">End Date (optional)</Label>
                <Input id="ends_at" name="ends_at" type="date" />
                {fieldErrors.ends_at && (
                  <p className="text-sm text-red-600">{fieldErrors.ends_at}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_students">Max Students (optional)</Label>
              <Input
                id="max_students"
                name="max_students"
                type="number"
                placeholder="Leave blank for unlimited"
                min={1}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Cohort"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
