"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import { LearningPathForm } from "@/components/learning-paths/learning-path-form";
import { PathCourseManager } from "@/components/learning-paths/path-course-manager";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import type { LearningPath } from "@/lib/domains/learning-paths/types";
import type { LearningPathFormData } from "@/lib/domains/learning-paths/validation";

interface EditPathPageProps {
  params: Promise<{ pathId: string }>;
}

export default function EditPathPage({ params }: EditPathPageProps) {
  const { pathId } = use(params);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPath() {
      try {
        const res = await fetch(`/api/paths/${pathId}`);

        if (res.status === 404) {
          setNotFound(true);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch learning path");
        }

        const body = await res.json();
        setPath(body.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load learning path";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPath();
  }, [pathId]);

  async function handleSubmit(data: LearningPathFormData) {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/paths/${pathId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update learning path");
      }

      const body = await res.json();
      setPath(body.data);
      toast.success("Learning path updated");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update learning path";
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
            <Link href={ROUTES.adminPaths}>
              <ArrowLeft />
              Back to Learning Paths
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-lg font-semibold">Learning Path Not Found</h2>
          <p className="text-muted-foreground">
            The learning path you are looking for does not exist or you do not
            have access.
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
            <Link href={ROUTES.adminPaths}>
              <ArrowLeft />
              Back to Learning Paths
            </Link>
          </Button>
        </div>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4 rounded-xl border p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
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
          <Link href={ROUTES.adminPaths}>
            <ArrowLeft />
            Back to Learning Paths
          </Link>
        </Button>
      </div>

      <div className="mx-auto max-w-3xl">
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <LearningPathForm
              initialData={path ?? undefined}
              onSubmit={handleSubmit}
              isLoading={isSaving}
            />
          </TabsContent>

          <TabsContent value="courses">
            <PathCourseManager pathId={pathId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
