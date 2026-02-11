"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { Course } from "@/lib/domains/courses/types";
import type { CourseFormData } from "@/lib/utils/validation";
import { ROUTES } from "@/lib/constants/routes";
import { CourseForm } from "@/components/courses/course-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export default function EditCoursePage({ params }: EditCoursePageProps) {
  const { courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);

        if (res.status === 404) {
          setNotFound(true);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch course");
        }

        const body = await res.json();
        setCourse(body.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load course";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourse();
  }, [courseId]);

  async function handleSubmit(data: CourseFormData) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update course");
      }

      toast.success("Course updated successfully");
      router.push(ROUTES.adminCourses);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update course";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.adminCourses}>
              <ArrowLeft />
              Back to Courses
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-lg font-semibold">Course Not Found</h2>
          <p className="text-muted-foreground">
            The course you are looking for does not exist or you do not have access.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.adminCourses}>
              <ArrowLeft />
              Back to Courses
            </Link>
          </Button>
        </div>
        <div className="mx-auto max-w-2xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4 rounded-xl border p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.adminCourses}>
            <ArrowLeft />
            Back to Courses
          </Link>
        </Button>
      </div>

      <div className="mx-auto max-w-2xl">
        <CourseForm
          initialData={course ?? undefined}
          onSubmit={handleSubmit}
          isLoading={isSaving}
        />
      </div>
    </div>
  );
}
