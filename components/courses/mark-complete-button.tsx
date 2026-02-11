"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarkCompleteButtonProps {
  lessonId: string;
  cohortId: string;
  isCompleted: boolean;
  onCompleted?: () => void;
}

export function MarkCompleteButton({
  lessonId,
  cohortId,
  isCompleted: initialCompleted,
  onCompleted,
}: MarkCompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();

  function handleMarkComplete() {
    if (completed) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/progress/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lesson_id: lessonId, cohort_id: cohortId }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to mark complete");
        }

        setCompleted(true);
        onCompleted?.();
      } catch (error) {
        console.error("Failed to mark lesson complete:", error);
      }
    });
  }

  if (completed) {
    return (
      <Button
        variant="outline"
        disabled
        className={cn(
          "border-green-200 bg-green-50 text-green-700",
          "dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        )}
      >
        <Check className="mr-2 h-4 w-4" />
        Completed
      </Button>
    );
  }

  return (
    <Button onClick={handleMarkComplete} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Check className="mr-2 h-4 w-4" />
      )}
      Mark as Complete
    </Button>
  );
}
