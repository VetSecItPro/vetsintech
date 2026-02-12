// ============================================================================
// Cache Layer
// Centralized caching utilities using Next.js unstable_cache with tag-based
// invalidation. Wrap expensive read queries; bust on mutations.
// ============================================================================

import { unstable_cache, revalidateTag } from "next/cache";

// ---------------------------------------------------------------------------
// Cache Tags — namespaced by entity + org for granular invalidation
// ---------------------------------------------------------------------------

export const CacheTags = {
  /** Dashboard stats for an organization */
  dashboardStats: (orgId: string) => `dashboard-stats-${orgId}`,

  /** Course list for an organization */
  courses: (orgId: string) => `courses-${orgId}`,

  /** Course categories for an organization */
  courseCategories: (orgId: string) => `course-categories-${orgId}`,

  /** Enrollment trends for an organization */
  enrollmentTrends: (orgId: string) => `enrollment-trends-${orgId}`,

  /** Course analytics for an organization */
  courseAnalytics: (orgId: string) => `course-analytics-${orgId}`,

  /** Cohort list for an organization */
  cohorts: (orgId: string) => `cohorts-${orgId}`,

  /** Resources for an organization */
  resources: (orgId: string) => `resources-${orgId}`,

  /** Learning paths for an organization */
  learningPaths: (orgId: string) => `learning-paths-${orgId}`,

  /** Announcements for an organization */
  announcements: (orgId: string) => `announcements-${orgId}`,
} as const;

// ---------------------------------------------------------------------------
// Cache Durations (seconds)
// ---------------------------------------------------------------------------

export const CacheDurations = {
  /** Dashboard stats — moderate staleness acceptable */
  DASHBOARD_STATS: 60,

  /** Course list — invalidated on CRUD, time-based fallback */
  COURSES: 120,

  /** Course categories — rarely changes */
  COURSE_CATEGORIES: 300,

  /** Enrollment trends — daily data, moderate refresh */
  ENROLLMENT_TRENDS: 120,

  /** Course analytics — heavy computation, moderate staleness ok */
  COURSE_ANALYTICS: 120,

  /** Cohorts — invalidated on CRUD */
  COHORTS: 120,

  /** Resources — invalidated on CRUD */
  RESOURCES: 120,

  /** Learning paths — invalidated on CRUD */
  LEARNING_PATHS: 300,

  /** Announcements — invalidated on publish */
  ANNOUNCEMENTS: 60,
} as const;

// ---------------------------------------------------------------------------
// Cache Wrapper
// ---------------------------------------------------------------------------

/**
 * Create a cached version of an async function.
 *
 * @param fn - The async function to cache
 * @param keyParts - Static key parts for cache identification
 * @param tags - Cache tags for invalidation
 * @param revalidate - Time in seconds before revalidation
 */
export function cached<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  tags: string[],
  revalidate: number
): () => Promise<T> {
  return unstable_cache(fn, keyParts, {
    tags,
    revalidate,
  });
}

// ---------------------------------------------------------------------------
// Invalidation Helpers
// ---------------------------------------------------------------------------

/**
 * Bust a single cache tag using the "default" cache life profile.
 * Silently no-ops outside of a Next.js request context (e.g., in tests).
 */
function bustTag(tag: string): void {
  try {
    revalidateTag(tag, "default");
  } catch {
    // Outside Next.js request context (tests, scripts) — skip silently
  }
}

/**
 * Invalidate all caches related to course data for an organization.
 * Call after creating, updating, or deleting a course.
 */
export function invalidateCourseCache(orgId: string): void {
  bustTag(CacheTags.courses(orgId));
  bustTag(CacheTags.courseCategories(orgId));
  bustTag(CacheTags.courseAnalytics(orgId));
  bustTag(CacheTags.dashboardStats(orgId));
}

/**
 * Invalidate caches related to enrollment changes.
 * Call after enrolling/unenrolling a student.
 */
export function invalidateEnrollmentCache(orgId: string): void {
  bustTag(CacheTags.enrollmentTrends(orgId));
  bustTag(CacheTags.dashboardStats(orgId));
  bustTag(CacheTags.courseAnalytics(orgId));
}

/**
 * Invalidate caches related to cohort changes.
 */
export function invalidateCohortCache(orgId: string): void {
  bustTag(CacheTags.cohorts(orgId));
  bustTag(CacheTags.dashboardStats(orgId));
}

/**
 * Invalidate resource caches for an organization.
 */
export function invalidateResourceCache(orgId: string): void {
  bustTag(CacheTags.resources(orgId));
}

/**
 * Invalidate learning path caches for an organization.
 */
export function invalidateLearningPathCache(orgId: string): void {
  bustTag(CacheTags.learningPaths(orgId));
}

/**
 * Invalidate announcement caches for an organization.
 */
export function invalidateAnnouncementCache(orgId: string): void {
  bustTag(CacheTags.announcements(orgId));
  bustTag(CacheTags.dashboardStats(orgId));
}
