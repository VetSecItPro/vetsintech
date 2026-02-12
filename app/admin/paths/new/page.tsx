"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import { LearningPathForm } from "@/components/learning-paths/learning-path-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { LearningPathFormData } from "@/lib/domains/learning-paths/validation";

export default function NewPathPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(data: LearningPathFormData) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create learning path");
      }

      const body = await res.json();
      toast.success("Learning path created");
      router.push(ROUTES.adminPath(body.data.id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create learning path";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
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

      <div className="mx-auto max-w-2xl">
        <LearningPathForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
