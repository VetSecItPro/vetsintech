// ============================================================================
// Progress Domain Utilities
// Pure functions — no Supabase, no React, no Next.js
// ============================================================================

import type { ModuleWithLessons } from "@/lib/domains/courses/types";

/**
 * Calculate progress percentage (0-100) from completed and total lessons.
 * Returns 0 if totalRequiredLessons is 0 to avoid division by zero.
 */
export function calculateProgressPercentage(
  completedLessons: number,
  totalRequiredLessons: number
): number {
  if (totalRequiredLessons <= 0) return 0;
  const pct = (completedLessons / totalRequiredLessons) * 100;
  return Math.min(Math.round(pct * 100) / 100, 100); // Round to 2 decimal places, cap at 100
}

/**
 * Walk the module/lesson tree to find the next lesson after the given one.
 * Modules and lessons are expected to be sorted by sort_order.
 * Returns null if the current lesson is the last one.
 */
export function getNextLesson(
  modules: ModuleWithLessons[],
  currentLessonId: string
): { moduleId: string; lessonId: string } | null {
  // Build a flat ordered list of all lessons
  const flatLessons: { moduleId: string; lessonId: string }[] = [];
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      flatLessons.push({ moduleId: mod.id, lessonId: lesson.id });
    }
  }

  const currentIndex = flatLessons.findIndex(
    (item) => item.lessonId === currentLessonId
  );
  if (currentIndex === -1 || currentIndex === flatLessons.length - 1) {
    return null;
  }

  return flatLessons[currentIndex + 1];
}

/**
 * Walk the module/lesson tree to find the previous lesson before the given one.
 * Modules and lessons are expected to be sorted by sort_order.
 * Returns null if the current lesson is the first one.
 */
export function getPreviousLesson(
  modules: ModuleWithLessons[],
  currentLessonId: string
): { moduleId: string; lessonId: string } | null {
  const flatLessons: { moduleId: string; lessonId: string }[] = [];
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      flatLessons.push({ moduleId: mod.id, lessonId: lesson.id });
    }
  }

  const currentIndex = flatLessons.findIndex(
    (item) => item.lessonId === currentLessonId
  );
  if (currentIndex <= 0) {
    return null;
  }

  return flatLessons[currentIndex - 1];
}

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: "2h 15m", "45m", "30s", "0s"
 */
export function formatTimeSpent(seconds: number): string {
  if (seconds < 0) seconds = 0;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

/**
 * Check if a course is fully completed.
 * A course is done when every required lesson ID appears in the completed set.
 */
export function isCourseDone(
  completedLessonIds: string[],
  requiredLessonIds: string[]
): boolean {
  if (requiredLessonIds.length === 0) return true;
  const completedSet = new Set(completedLessonIds);
  return requiredLessonIds.every((id) => completedSet.has(id));
}
