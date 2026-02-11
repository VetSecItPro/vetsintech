"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { CourseFormData } from "@/lib/utils/validation";
import { ROUTES } from "@/lib/constants/routes";
import { CourseForm } from "@/components/courses/course-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(data: CourseFormData) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create course");
      }

      toast.success("Course created successfully");
      router.push(ROUTES.adminCourses);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create course";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
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
        <CourseForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
